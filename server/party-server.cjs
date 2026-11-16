/**
 * Kazwire Party server — jklm.fun-style multiplayer rooms.
 *
 * Runs as its own process (systemd: kazwire-party) like the UV bare-server; nginx
 * reverse-proxies `/party/` (incl. websocket upgrades) here. Everything is in-memory
 * (no DB) — rooms evaporate when empty. Two modes per room:
 *   - "push":  the leader picks any Kazwire game and everyone's room view loads it.
 *   - "bomb":  a server-authoritative BombParty spelling game (type a real word
 *              containing the prompt syllable before the timer runs out; lose a life;
 *              last player standing wins).
 *
 * Scale guards (the box must handle this): capped rooms/players/word-length/chat,
 * a 30s heartbeat that drops dead sockets, per-room timers cleared on empty, and all
 * validation server-side so a client can't cheat or blow up memory.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PARTY_PORT) || 8091;
const HOST = process.env.PARTY_HOST || '127.0.0.1';

const MAX_ROOMS = 1000;
const MAX_PLAYERS_PER_ROOM = 16;
const MAX_NAME = 24;
const MAX_CHAT = 300;
const MAX_WORD = 30;
const CHAT_HISTORY = 60;
const START_LIVES = 2;
const TURN_TIME_START = 15; // seconds (tightened from 20 — the clock is the pressure)
const TURN_TIME_MIN = 5;

/* ----------------------------- dictionary ----------------------------- */
const WORDS = new Set();
// Two prompt pools so difficulty can RAMP within a game: EASY = the most common
// 2-letter combos (tons of everyday answers); HARD = 3-letter combos including
// rarer ones that force you to actually think. randomSyllable(round) leans
// harder as the round climbs — early turns stay friendly, late turns bite.
let EASY_SYLLABLES = [];
let HARD_SYLLABLES = [];
(function loadDictionary() {
	try {
		const file = path.join(__dirname, 'wordlist.txt');
		const text = fs.readFileSync(file, 'utf8');
		for (const w of text.split('\n')) {
			const word = w.trim();
			if (word) WORDS.add(word);
		}
		// Rank 2- and 3-letter substrings by how many words contain them.
		const counts = new Map();
		for (const w of WORDS) {
			if (w.length < 2 || !/^[a-z]+$/.test(w)) continue; // ignore junk / non-plain words
			const seen = new Set();
			for (let len = 2; len <= 3; len++) {
				for (let i = 0; i + len <= w.length; i++) {
					const s = w.slice(i, i + len);
					if (seen.has(s)) continue;
					seen.add(s);
					counts.set(s, (counts.get(s) || 0) + 1);
				}
			}
		}
		const topByLen = (len, minCount, take) =>
			[...counts.entries()]
				.filter(([s, n]) => s.length === len && n >= minCount)
				.sort((a, b) => b[1] - a[1])
				.slice(0, take)
				.map(([s]) => s);
		// EASY: the ~90 most common 2-letter combos. HARD: ~140 three-letter combos
		// with a LOWER frequency floor, so the tail includes genuinely tricky prompts.
		EASY_SYLLABLES = topByLen(2, 1500, 90);
		HARD_SYLLABLES = topByLen(3, 250, 140);
		if (EASY_SYLLABLES.length < 10) throw new Error('too few common syllables');
		if (HARD_SYLLABLES.length < 10) HARD_SYLLABLES = EASY_SYLLABLES.slice(); // degrade safely
		console.log(`[party] dictionary: ${WORDS.size} words, ${EASY_SYLLABLES.length} easy + ${HARD_SYLLABLES.length} hard prompts`);
	} catch (err) {
		console.error('[party] failed to load wordlist.txt:', err.message);
		// Fallback so the game still runs (degraded) if the wordlist is missing.
		EASY_SYLLABLES = ['er', 'an', 'in', 'on', 'at', 'en', 'or', 'es', 'te', 'ri'];
		HARD_SYLLABLES = ['ing', 'ary', 'tion', 'ent', 'ere', 'con', 'ate', 'ish', 'str', 'pro'];
	}
})();

// Pick a prompt for the given round. Chance of a HARD (3-letter / rarer) prompt
// climbs from ~10% at round 1 to a 80% ceiling, so the game escalates on its own.
function randomSyllable(round = 1) {
	const hardChance = Math.min(0.8, 0.1 + (round - 1) * 0.035);
	const useHard = HARD_SYLLABLES.length && Math.random() < hardChance;
	const pool = useHard ? HARD_SYLLABLES : EASY_SYLLABLES;
	return pool[Math.floor(Math.random() * pool.length)] || EASY_SYLLABLES[0] || 'er';
}

// Minimum word length also grows with the round: 3 early, up to 6 deep in a game.
function bombMinLen(round = 1) {
	return Math.min(6, 3 + Math.floor((round - 1) / 12));
}

/* ----------------------------- moderation ----------------------------- */
const BANNED = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic', 'chink', 'tranny', 'rape', 'kys'];
function deob(s) {
	return s.toLowerCase().replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't').replace(/[^a-z]/g, '');
}
function censor(text) {
	return String(text)
		.split(/(\s+)/)
		.map((tok) => {
			if (/^\s*$/.test(tok)) return tok;
			const d = deob(tok);
			for (const b of BANNED) {
				if (d.includes(b)) return tok.length <= 2 ? '*'.repeat(tok.length) : tok[0] + '*'.repeat(tok.length - 1);
			}
			return tok;
		})
		.join('');
}
function cleanName(n) {
	const s = String(n || '').replace(/[\x00-\x1f<>]/g, '').trim().slice(0, MAX_NAME);
	return censor(s) || 'Anonymous';
}

/* ----------------------------- rooms ----------------------------- */
/** @type {Map<string, Room>} */
const rooms = new Map();

function makeCode() {
	const alpha = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
	let code;
	do {
		code = Array.from({ length: 4 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
	} while (rooms.has(code));
	return code;
}

function getOrCreateRoom(code) {
	let room = rooms.get(code);
	if (!room) {
		if (rooms.size >= MAX_ROOMS) return null;
		room = {
			code,
			leaderId: null,
			mode: 'lobby', // 'lobby' | 'push' | 'bomb'
			currentGame: null, // { gameId, title, url }
			players: new Map(), // id -> player
			chat: [],
			bomb: null,
			timer: null
		};
		rooms.set(code, room);
	}
	return room;
}

function publicPlayers(room) {
	return [...room.players.values()].map((p) => ({
		id: p.id,
		name: p.name,
		score: p.score,
		lives: p.lives,
		connected: p.connected,
		isLeader: p.id === room.leaderId
	}));
}

function send(ws, msg) {
	if (ws && ws.readyState === 1) {
		try {
			ws.send(JSON.stringify(msg));
		} catch {
			/* ignore */
		}
	}
}

function broadcast(room, msg) {
	for (const p of room.players.values()) send(p.ws, msg);
}

function broadcastState(room) {
	const players = publicPlayers(room);
	for (const p of room.players.values()) {
		send(p.ws, {
			t: 'state',
			room: {
				code: room.code,
				mode: room.mode,
				leaderId: room.leaderId,
				currentGame: room.currentGame,
				players
			},
			you: { id: p.id, isLeader: p.id === room.leaderId }
		});
	}
}

function systemMsg(room, text) {
	broadcast(room, { t: 'system', text, ts: Date.now() });
}

function reassignLeaderIfNeeded(room) {
	if (room.leaderId && room.players.has(room.leaderId) && room.players.get(room.leaderId).connected) return;
	const next = [...room.players.values()].find((p) => p.connected);
	room.leaderId = next ? next.id : null;
}

function destroyRoomIfEmpty(room) {
	const anyConnected = [...room.players.values()].some((p) => p.connected);
	if (!anyConnected) {
		if (room.timer) clearInterval(room.timer);
		rooms.delete(room.code);
	}
}

/* ----------------------------- BombParty ----------------------------- */
function bombAlive(room) {
	return [...room.players.values()].filter((p) => p.connected && p.lives > 0);
}

function startBomb(room) {
	const alive = [...room.players.values()].filter((p) => p.connected);
	if (alive.length < 2) return { error: 'Need at least 2 players to start.' };
	room.mode = 'bomb';
	room.currentGame = null;
	for (const p of room.players.values()) {
		p.lives = p.connected ? START_LIVES : 0;
		p.score = 0;
	}
	room.bomb = {
		order: alive.map((p) => p.id),
		turnIdx: 0,
		prompt: randomSyllable(1),
		used: new Set(),
		timeLeft: TURN_TIME_START,
		turnTime: TURN_TIME_START,
		round: 1,
		lastWord: '',
		message: ''
	};
	startTimer(room);
	broadcastState(room);
	broadcastBomb(room);
	return {};
}

function currentBombPlayerId(room) {
	const b = room.bomb;
	if (!b || !b.order.length) return null;
	return b.order[b.turnIdx % b.order.length];
}

function broadcastBomb(room) {
	const b = room.bomb;
	if (!b) return;
	broadcast(room, {
		t: 'bomb',
		bomb: {
			prompt: b.prompt,
			currentPlayerId: currentBombPlayerId(room),
			timeLeft: b.timeLeft,
			turnTime: b.turnTime,
			round: b.round,
			minLen: bombMinLen(b.round),
			lastWord: b.lastWord,
			message: b.message,
			players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, lives: p.lives, connected: p.connected }))
		}
	});
}

function advanceTurn(room, { lostLife } = {}) {
	const b = room.bomb;
	if (!b) return;
	// Rebuild the alive order (players may have left / been eliminated).
	const alive = bombAlive(room);
	if (alive.length <= 1) return endBomb(room, alive[0]);

	// Move to the next still-alive player after the current index.
	const currentId = currentBombPlayerId(room);
	let idx = b.order.indexOf(currentId);
	for (let step = 0; step < b.order.length; step++) {
		idx = (idx + 1) % b.order.length;
		const pid = b.order[idx];
		const p = room.players.get(pid);
		if (p && p.connected && p.lives > 0) break;
	}
	b.turnIdx = idx;
	b.round += 1;
	b.prompt = randomSyllable(b.round);
	// Ramp difficulty: shave a second off the clock every 2 rounds, down to the floor.
	b.turnTime = Math.max(TURN_TIME_MIN, TURN_TIME_START - Math.floor(b.round / 2));
	b.timeLeft = b.turnTime;
	if (!lostLife) b.message = '';
	broadcastState(room);
	broadcastBomb(room);
}

function endBomb(room, winner) {
	if (room.timer) {
		clearInterval(room.timer);
		room.timer = null;
	}
	room.mode = 'lobby';
	const winnerInfo = winner ? { id: winner.id, name: winner.name } : null;
	if (winnerInfo) {
		const w = room.players.get(winnerInfo.id);
		if (w) w.score = (w.score || 0) + 1;
	}
	room.bomb = null;
	broadcast(room, { t: 'bombEnd', winner: winnerInfo });
	broadcastState(room);
}

function startTimer(room) {
	if (room.timer) clearInterval(room.timer);
	room.timer = setInterval(() => {
		const b = room.bomb;
		if (!b) {
			clearInterval(room.timer);
			room.timer = null;
			return;
		}
		b.timeLeft -= 1;
		if (b.timeLeft <= 0) {
			// Current player runs out of time -> lose a life.
			const pid = currentBombPlayerId(room);
			const p = room.players.get(pid);
			if (p) {
				p.lives = Math.max(0, p.lives - 1);
				b.message = `💥 ${p.name} lost a life!`;
				if (p.lives <= 0) b.message = `💥 ${p.name} is out!`;
			}
			const alive = bombAlive(room);
			if (alive.length <= 1) return endBomb(room, alive[0]);
			advanceTurn(room, { lostLife: true });
		} else {
			broadcastBomb(room);
		}
	}, 1000);
}

function submitWord(room, player, wordRaw) {
	const b = room.bomb;
	if (!b || room.mode !== 'bomb') return;
	if (currentBombPlayerId(room) !== player.id) {
		return send(player.ws, { t: 'wordResult', ok: false, reason: "It's not your turn." });
	}
	const word = String(wordRaw || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, MAX_WORD);
	const minLen = bombMinLen(b.round);
	if (word.length < minLen) return send(player.ws, { t: 'wordResult', ok: false, reason: minLen > 3 ? `Need ${minLen}+ letters.` : 'Too short.' });
	if (!word.includes(b.prompt)) return send(player.ws, { t: 'wordResult', ok: false, reason: `Must contain "${b.prompt.toUpperCase()}".` });
	if (b.used.has(word)) return send(player.ws, { t: 'wordResult', ok: false, reason: 'Already used.' });
	if (!WORDS.has(word)) return send(player.ws, { t: 'wordResult', ok: false, reason: 'Not in the dictionary.' });

	// Valid!
	b.used.add(word);
	player.score = (player.score || 0) + word.length;
	b.lastWord = word;
	b.message = '';
	send(player.ws, { t: 'wordResult', ok: true });
	advanceTurn(room);
}

/* ----------------------------- ws wiring ----------------------------- */
const server = http.createServer((req, res) => {
	if (req.url === '/party/health' || req.url === '/health') {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		return res.end(JSON.stringify({ ok: true, rooms: rooms.size, words: WORDS.size }));
	}
	if (req.url === '/party/rooms' || req.url === '/rooms') {
		// jklm.fun-style public room list: every room with at least one connected
		// player, busiest first, capped so the payload stays tiny.
		const list = [];
		for (const room of rooms.values()) {
			const players = [...room.players.values()].filter((p) => p.connected).length;
			if (players < 1) continue;
			list.push({
				code: room.code,
				players,
				mode: room.mode,
				game: room.currentGame ? room.currentGame.title : null
			});
		}
		list.sort((a, b) => b.players - a.players);
		// CORS: in dev the site (:5173) polls the party server (:8091) cross-origin.
		res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		return res.end(JSON.stringify({ rooms: list.slice(0, 50) }));
	}
	res.writeHead(404, { 'Content-Type': 'text/plain' });
	res.end('Not found');
});

const wss = new WebSocketServer({ server, path: '/party/ws', maxPayload: 4 * 1024 });

wss.on('connection', (ws) => {
	ws.isAlive = true;
	// A socket error (ECONNRESET etc.) with no listener is an uncaught exception
	// that takes down the whole party server — swallow it; 'close' still fires.
	ws.on('error', (err) => {
		console.error('[party] ws error:', err.message);
	});
	ws.on('pong', () => {
		ws.isAlive = true;
	});

	// Per-connection binding, set on 'join'.
	let room = null;
	let player = null;

	ws.on('message', (buf) => {
		let msg;
		try {
			msg = JSON.parse(buf.toString());
		} catch {
			return;
		}
		if (!msg || typeof msg.t !== 'string') return;

		if (msg.t === 'join') {
			if (player) return; // already joined on this socket
			const code = String(msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
			if (!code) return send(ws, { t: 'error', message: 'Invalid room code.' });
			room = getOrCreateRoom(code);
			if (!room) return send(ws, { t: 'error', message: 'Server is full, try again later.' });
			if (room.players.size >= MAX_PLAYERS_PER_ROOM) return send(ws, { t: 'error', message: 'This room is full.' });

			const id = Math.random().toString(36).slice(2, 10);
			player = { id, uid: String(msg.uid || '').slice(0, 64), name: cleanName(msg.name), ws, score: 0, lives: 0, connected: true };
			room.players.set(id, player);
			if (!room.leaderId) room.leaderId = id;

			send(ws, { t: 'joined', code: room.code, you: { id, name: player.name } });
			// Send recent chat history to the newcomer.
			for (const c of room.chat) send(ws, c);
			systemMsg(room, `${player.name} joined`);
			broadcastState(room);
			if (room.mode === 'bomb') broadcastBomb(room);
			return;
		}

		if (!room || !player) return; // must join first

		switch (msg.t) {
			case 'chat': {
				const text = censor(String(msg.text || '').replace(/[\x00-\x1f]/g, '').trim().slice(0, MAX_CHAT));
				if (!text) return;
				const c = { t: 'chat', from: player.id, name: player.name, text, ts: Date.now() };
				room.chat.push(c);
				if (room.chat.length > CHAT_HISTORY) room.chat.shift();
				broadcast(room, c);
				break;
			}
			case 'setGame': {
				if (player.id !== room.leaderId) return;
				const url = String(msg.url || '');
				if (!/^https?:\/\//.test(url) && !url.startsWith('/')) return;
				room.mode = 'push';
				if (room.timer) { clearInterval(room.timer); room.timer = null; }
				room.bomb = null;
				room.currentGame = { gameId: String(msg.gameId || '').slice(0, 80), title: String(msg.title || 'Game').slice(0, 80), url: url.slice(0, 400) };
				systemMsg(room, `${player.name} started ${room.currentGame.title}`);
				broadcastState(room);
				break;
			}
			case 'backToLobby': {
				if (player.id !== room.leaderId) return;
				if (room.timer) { clearInterval(room.timer); room.timer = null; }
				room.mode = 'lobby';
				room.currentGame = null;
				room.bomb = null;
				broadcastState(room);
				break;
			}
			case 'startBomb': {
				if (player.id !== room.leaderId) return;
				const r = startBomb(room);
				if (r.error) send(ws, { t: 'error', message: r.error });
				break;
			}
			case 'word': {
				submitWord(room, player, msg.word);
				break;
			}
			case 'typing': {
				// Live preview of the current player's typing (bomb mode) — broadcast lightly.
				if (room.mode === 'bomb' && currentBombPlayerId(room) === player.id) {
					broadcast(room, { t: 'typing', text: String(msg.text || '').slice(0, MAX_WORD) });
				}
				break;
			}
		}
	});

	ws.on('close', () => {
		if (!room || !player) return;
		player.connected = false;
		player.ws = null;
		systemMsg(room, `${player.name} left`);
		// Fully remove the player after a short grace (keeps scores if they refresh fast).
		room.players.delete(player.id);
		reassignLeaderIfNeeded(room);

		if (room.mode === 'bomb' && room.bomb) {
			const alive = bombAlive(room);
			if (alive.length <= 1) endBomb(room, alive[0]);
			else if (currentBombPlayerId(room) == null) advanceTurn(room);
			else broadcastBomb(room);
		}
		broadcastState(room);
		destroyRoomIfEmpty(room);
	});
});

// Heartbeat: drop sockets that stopped responding (frees rooms/memory).
const heartbeat = setInterval(() => {
	for (const ws of wss.clients) {
		if (ws.isAlive === false) {
			ws.terminate();
			continue;
		}
		ws.isAlive = false;
		try {
			ws.ping();
		} catch {
			/* ignore */
		}
	}
}, 30000);
wss.on('close', () => clearInterval(heartbeat));

wss.on('error', (err) => {
	console.error('[party] wss error:', err.message);
});
server.on('error', (err) => {
	console.error('[party] http error:', err.message);
});

// Last-resort guards (same shape as proxy-server): log and keep serving rather
// than letting one bad socket/promise kill every active room.
process.on('uncaughtException', (err) => {
	console.error('[party] uncaughtException:', err);
});
process.on('unhandledRejection', (err) => {
	console.error('[party] unhandledRejection:', err);
});

server.listen(PORT, HOST, () => {
	console.log(`[party] listening on ws://${HOST}:${PORT}/party/ws`);
});
