<script lang="ts">
	// A party room — realtime via the Kazwire party WebSocket server.
	// Mobbin ref: Discord voice/stage channel (member list + chat + shared stage) and
	// jklm.fun BombParty (center prompt + bomb timer + player ring).
	import { onMount, onDestroy, tick } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import { getUid, getPlayerName, setPlayerName } from '$lib/utils/streak';
	import { games } from '$lib/data/games';
	import { CDN_BASE_URL, getCDNImageUrl } from '$lib/utils/cdn';

	const code = $page.params.code?.toUpperCase() ?? '';

	let ws: WebSocket | null = null;
	let connected = false;
	let joined = false;
	let errorMsg = '';

	let me = { id: '', isLeader: false };
	let room: any = { mode: 'lobby', players: [], leaderId: null, currentGame: null };
	let bomb: any = null;
	let winner: any = null;
	let typingPreview = '';

	type ChatLine = { kind: 'chat' | 'system'; name?: string; text: string; ts: number };
	let chat: ChatLine[] = [];
	let chatText = '';
	let chatBox: HTMLDivElement;

	let wordInput = '';
	let wordError = '';

	// Game picker (leader push mode)
	let showPicker = false;
	let pickerQuery = '';
	let aiGames: any[] = [];
	$: libraryGames = games.map((g: any) => ({
		id: g.href.split('/').pop(),
		title: g.title,
		image: getCDNImageUrl(g.image, 'game'),
		url: `${CDN_BASE_URL}/game/static/${g.href.split('/').pop()}/index.html`,
		play: g.play,
		ai: false
	}));
	$: pickerResults = [
		...aiGames.map((g) => ({ id: g.id, title: g.title, url: g.codeUrl, ai: true })),
		...libraryGames.filter((g: any) => g.play !== 'embed' && g.play !== 'ruffle')
	].filter((g: any) => !pickerQuery || g.title.toLowerCase().includes(pickerQuery.toLowerCase())).slice(0, 60);

	function wsUrl() {
		if (import.meta.env.DEV) return 'ws://localhost:8091/party/ws';
		return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/party/ws`;
	}

	function connect() {
		let name = getPlayerName();
		if (!name || name === 'Anonymous') {
			const n = (prompt('Pick a display name to join the room:') || '').trim();
			if (!n) { errorMsg = 'A name is required to join.'; return; }
			setPlayerName(n);
			name = n;
		}
		ws = new WebSocket(wsUrl());
		ws.onopen = () => {
			connected = true;
			send({ t: 'join', code, name, uid: getUid() });
		};
		ws.onclose = () => {
			connected = false;
			joined = false;
			// Auto-reconnect after a short delay unless we navigated away.
			if (!destroyed) setTimeout(connect, 1500);
		};
		ws.onerror = () => { errorMsg = 'Connection problem — retrying…'; };
		ws.onmessage = (e) => handle(JSON.parse(e.data));
	}

	function send(msg: any) {
		if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
	}

	async function handle(msg: any) {
		switch (msg.t) {
			case 'joined':
				joined = true;
				me.id = msg.you.id;
				errorMsg = '';
				break;
			case 'state':
				room = msg.room;
				me = msg.you;
				if (room.mode !== 'bomb') bomb = null;
				break;
			case 'bomb':
				bomb = msg.bomb;
				winner = null;
				if (bomb.currentPlayerId !== me.id) typingPreview = '';
				break;
			case 'bombEnd':
				winner = msg.winner;
				bomb = null;
				break;
			case 'chat':
				chat = [...chat, { kind: 'chat' as const, name: msg.name, text: msg.text, ts: msg.ts }].slice(-100);
				await scrollChat();
				break;
			case 'system':
				chat = [...chat, { kind: 'system' as const, text: msg.text, ts: msg.ts }].slice(-100);
				await scrollChat();
				break;
			case 'typing':
				if (bomb && bomb.currentPlayerId !== me.id) typingPreview = msg.text;
				break;
			case 'wordResult':
				if (msg.ok) { wordInput = ''; wordError = ''; }
				else { wordError = msg.reason || 'Invalid'; }
				break;
			case 'error':
				errorMsg = msg.message;
				break;
		}
	}

	async function scrollChat() {
		await tick();
		if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
	}

	function sendChat() {
		const t = chatText.trim();
		if (!t) return;
		send({ t: 'chat', text: t });
		chatText = '';
	}

	function pushGame(g: any) {
		send({ t: 'setGame', gameId: g.id, title: g.title, url: g.url });
		showPicker = false;
	}

	function submitWord() {
		const w = wordInput.trim();
		if (!w) return;
		send({ t: 'word', word: w });
	}

	function onWordType() {
		send({ t: 'typing', text: wordInput });
	}

	async function loadAiGames() {
		try {
			const r = await fetch('/api/ai/gallery');
			const j = await r.json();
			aiGames = (j.games || []).filter((g: any) => g.codeUrl).slice(0, 30);
		} catch { /* ignore */ }
	}

	const shareLink = () => `${location.origin}/rooms/${code}`;
	let copied = false;
	async function copyLink() {
		try { await navigator.clipboard.writeText(shareLink()); copied = true; setTimeout(() => (copied = false), 1500); } catch {}
	}

	let destroyed = false;
	onMount(() => {
		connect();
		loadAiGames();
	});
	onDestroy(() => {
		destroyed = true;
		ws?.close();
	});

	$: myTurn = bomb && bomb.currentPlayerId === me.id;
	$: currentPlayerName = bomb ? bomb.players.find((p: any) => p.id === bomb.currentPlayerId)?.name : '';
</script>

<svelte:head><title>Room {code} — {config.branding.name}</title></svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto grid max-w-[1400px] grid-cols-1 gap-4 p-3 lg:grid-cols-[1fr_320px] lg:p-4">
		<!-- MAIN -->
		<main class="flex min-h-[70vh] flex-col gap-4">
			<!-- Header -->
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-base-100 p-4 ring-1 ring-base-300">
				<div class="flex items-center gap-3">
					<a href="/rooms" class="grid h-9 w-9 place-items-center rounded-full bg-base-200 text-base-content hover:bg-base-300" aria-label="Leave"><Icon icon="mdi:arrow-left" /></a>
					<div>
						<div class="text-xs font-bold uppercase tracking-wider text-base-content/50">Room</div>
						<div class="text-2xl font-black tracking-[0.2em] text-base-content">{code}</div>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button class="flex items-center gap-1.5 rounded-full bg-base-200 px-3 py-2 text-sm font-bold text-base-content hover:bg-base-300" on:click={copyLink}>
						<Icon icon={copied ? 'mdi:check' : 'mdi:link-variant'} /> {copied ? 'Copied!' : 'Invite'}
					</button>
					<span class="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold {connected ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
						<Icon icon={connected ? 'mdi:access-point' : 'mdi:access-point-off'} /> {connected ? 'Live' : 'Connecting…'}
					</span>
				</div>
			</div>

			{#if errorMsg}
				<div class="flex items-center gap-2 rounded-xl bg-error/10 px-4 py-3 text-sm font-bold text-error"><Icon icon="mdi:alert-circle" /> {errorMsg}</div>
			{/if}

			<!-- Leader controls -->
			{#if me.isLeader && room.mode !== 'bomb'}
				<div class="flex flex-wrap items-center gap-2 rounded-2xl bg-base-100 p-3 ring-1 ring-base-300">
					<span class="px-1 text-xs font-bold uppercase tracking-wider text-base-content/50">You're the leader</span>
					<button class="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:brightness-110" on:click={() => (showPicker = !showPicker)}>
						<Icon icon="mdi:gamepad-variant" /> Pick a game
					</button>
					<button class="flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-white hover:brightness-110" on:click={() => send({ t: 'startBomb' })}>
						<Icon icon="mdi:bomb" /> Start BombParty
					</button>
					{#if room.currentGame}
						<button class="flex items-center gap-1.5 rounded-full bg-base-200 px-4 py-2 text-sm font-bold text-base-content hover:bg-base-300" on:click={() => send({ t: 'backToLobby' })}>
							<Icon icon="mdi:home" /> Lobby
						</button>
					{/if}
				</div>
			{/if}

			<!-- Game picker -->
			{#if showPicker}
				<div class="flex flex-col gap-2 rounded-2xl bg-base-100 p-3 ring-1 ring-base-300">
					<input class="input input-bordered w-full" placeholder="Search games…" bind:value={pickerQuery} />
					<div class="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
						{#each pickerResults as g (g.id)}
							<button class="flex items-center gap-2 rounded-xl bg-base-200 p-2 text-left transition hover:ring-2 hover:ring-primary" on:click={() => pushGame(g)}>
								<Icon icon={g.ai ? 'mdi:robot-happy' : 'mdi:gamepad-variant'} class="flex-none text-lg text-primary" />
								<span class="truncate text-sm font-semibold text-base-content">{g.title}</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- STAGE -->
			<div class="flex flex-1 flex-col overflow-hidden rounded-2xl bg-base-100 ring-1 ring-base-300">
				{#if room.mode === 'bomb' && bomb}
					<!-- BombParty -->
					<div class="flex flex-1 flex-col items-center justify-center gap-6 p-6">
						<div class="flex flex-wrap justify-center gap-3">
							{#each bomb.players as p (p.id)}
								<div class="flex flex-col items-center gap-1 rounded-2xl px-4 py-3 ring-2 transition {p.id === bomb.currentPlayerId ? 'bg-primary/10 ring-primary' : 'bg-base-200 ring-transparent'} {p.lives <= 0 ? 'opacity-40' : ''}">
									<span class="font-bold text-base-content">{p.name}</span>
									<span class="flex gap-0.5 text-error">
										{#each Array(Math.max(0, p.lives)) as _}<Icon icon="mdi:heart" />{/each}
										{#if p.lives <= 0}<Icon icon="mdi:skull" class="text-base-content/40" />{/if}
									</span>
								</div>
							{/each}
						</div>

						<!-- Bomb + prompt -->
						<div class="relative grid h-40 w-40 place-items-center">
							<svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
								<circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" class="text-base-300" stroke-width="6" />
								<circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" class="text-primary" stroke-width="6"
									stroke-dasharray={2 * Math.PI * 45}
									stroke-dashoffset={2 * Math.PI * 45 * (1 - bomb.timeLeft / bomb.turnTime)}
									stroke-linecap="round" />
							</svg>
							<div class="flex flex-col items-center">
								<span class="text-4xl font-black uppercase tracking-wide text-primary">{bomb.prompt}</span>
								<span class="text-sm font-bold text-base-content/50">{bomb.timeLeft}s</span>
							</div>
						</div>

						{#if bomb.message}<div class="text-lg font-black text-error">{bomb.message}</div>{/if}
						{#if bomb.lastWord}<div class="text-sm text-base-content/50">last: <span class="font-bold text-base-content/70">{bomb.lastWord}</span></div>{/if}

						{#if myTurn}
							<div class="flex w-full max-w-md flex-col gap-2">
								<div class="flex gap-2">
									<input
										class="input input-bordered flex-1 text-center text-lg font-bold uppercase"
										placeholder="type a word with {bomb.prompt.toUpperCase()}"
										bind:value={wordInput}
										on:input={onWordType}
										on:keydown={(e) => e.key === 'Enter' && submitWord()}
										autofocus
									/>
									<button class="rounded-xl bg-primary px-5 font-bold text-white hover:brightness-110" on:click={submitWord}>Go</button>
								</div>
								{#if wordError}<span class="text-center text-sm font-bold text-error">{wordError}</span>{/if}
							</div>
						{:else}
							<div class="flex flex-col items-center gap-1">
								<span class="text-sm font-bold text-base-content/60">{currentPlayerName}'s turn…</span>
								{#if typingPreview}<span class="text-lg font-black uppercase tracking-wide text-base-content/40">{typingPreview}</span>{/if}
							</div>
						{/if}
					</div>
				{:else if room.mode === 'push' && room.currentGame}
					<!-- Pushed game -->
					<div class="flex items-center justify-between border-b border-base-300 px-4 py-2">
						<span class="flex items-center gap-2 font-bold text-base-content"><Icon icon="mdi:gamepad-variant" class="text-primary" /> {room.currentGame.title}</span>
					</div>
					<iframe title={room.currentGame.title} src={room.currentGame.url} class="h-[70vh] w-full bg-black" allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; fullscreen" />
				{:else}
					<!-- Lobby idle -->
					<div class="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
						<Icon icon="mdi:sofa" class="text-6xl text-base-content/20" />
						<p class="text-lg font-bold text-base-content">Waiting in the lobby</p>
						<p class="max-w-sm text-sm text-base-content/60">
							{#if me.isLeader}Pick a game to play together, or start a game of BombParty.{:else}The room leader will start a game soon. Invite friends with the code above!{/if}
						</p>
					</div>
				{/if}
			</div>
		</main>

		<!-- SIDEBAR: players + chat -->
		<aside class="flex max-h-[86vh] flex-col gap-4">
			<div class="rounded-2xl bg-base-100 p-4 ring-1 ring-base-300">
				<h2 class="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-content/60">
					<Icon icon="mdi:account-multiple" /> Players ({room.players.length})
				</h2>
				<div class="flex flex-col gap-1">
					{#each room.players as p (p.id)}
						<div class="flex items-center gap-2 rounded-lg px-2 py-1.5 {p.id === me.id ? 'bg-primary/5' : ''}">
							<span class="grid h-7 w-7 flex-none place-items-center rounded-full bg-primary/15 text-xs font-black text-primary">{p.name?.[0]?.toUpperCase() || '?'}</span>
							<span class="flex-1 truncate text-sm font-semibold text-base-content">{p.name}{#if p.id === me.id}<span class="text-base-content/40"> (you)</span>{/if}</span>
							{#if p.isLeader}<Icon icon="mdi:crown" class="text-warning" title="Leader" />{/if}
							{#if p.score > 0}<span class="text-xs font-bold text-base-content/50">{p.score}</span>{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="flex min-h-0 flex-1 flex-col rounded-2xl bg-base-100 ring-1 ring-base-300">
				<h2 class="flex items-center gap-2 border-b border-base-300 px-4 py-3 text-sm font-black uppercase tracking-wider text-base-content/60">
					<Icon icon="mdi:chat" /> Chat
				</h2>
				<div bind:this={chatBox} class="flex-1 space-y-1.5 overflow-y-auto p-3 text-sm">
					{#each chat as c}
						{#if c.kind === 'system'}
							<div class="text-center text-xs italic text-base-content/40">{c.text}</div>
						{:else}
							<div><span class="font-bold text-primary">{c.name}</span> <span class="text-base-content/80">{c.text}</span></div>
						{/if}
					{/each}
				</div>
				<div class="flex gap-2 border-t border-base-300 p-2">
					<input class="input input-sm input-bordered flex-1" placeholder="Say something…" maxlength="300" bind:value={chatText} on:keydown={(e) => e.key === 'Enter' && sendChat()} />
					<button class="btn btn-sm btn-primary text-white" on:click={sendChat} aria-label="Send"><Icon icon="mdi:send" /></button>
				</div>
			</div>
		</aside>
	</div>

	<!-- Winner overlay -->
	{#if winner}
		<div class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" on:click={() => (winner = null)} on:keydown role="button" tabindex="0">
			<div class="flex flex-col items-center gap-3 rounded-3xl bg-base-100 p-8 text-center shadow-2xl">
				<Icon icon="mdi:trophy" class="text-6xl text-warning" />
				<h3 class="text-2xl font-black text-base-content">{winner.name} wins!</h3>
				<p class="text-sm text-base-content/60">BombParty champion 🎉</p>
				<button class="rounded-full bg-primary px-6 py-2 font-bold text-white" on:click={() => (winner = null)}>Nice</button>
			</div>
		</div>
	{/if}
</div>
