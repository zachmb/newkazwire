// Insert uploaded duckmath games (from ~/duckmath-games/_new-games.json) into
// src/lib/data/games.ts. Idempotent: skips entries whose href already exists.
// Usage: node scripts/duckmath-register.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const entries = JSON.parse(fs.readFileSync(path.join(os.homedir(), 'duckmath-games', '_new-games.json'), 'utf8'));
const GAMES_TS = 'src/lib/data/games.ts';
let src = fs.readFileSync(GAMES_TS, 'utf8');

const existing = new Set([...src.matchAll(/"href":\s*"([^"]+)"/g)].map((m) => m[1]));
const fresh = entries.filter((e) => e && e.href && !existing.has(e.href));
if (!fresh.length) {
	console.log('nothing new to register');
	process.exit(0);
}

// serialize in the file's existing JSON-ish style (2-space indent, quoted keys)
const block = fresh
	.map((e) => {
		const s = JSON.stringify(
			{ title: e.title, image: e.image, href: e.href, description: e.description, tags: e.tags },
			null,
			4
		)
			.split('\n')
			.map((l) => '  ' + l)
			.join('\n');
		return s;
	})
	.join(',\n');

const closer = src.lastIndexOf('];');
if (closer < 0) throw new Error('games.ts array closer not found');
// insert before the closing bracket, after the last entry's `}`
const head = src.slice(0, closer).replace(/\s*$/, '');
const needsComma = head.trimEnd().endsWith('}');
src = head + (needsComma ? ',\n' : '\n') + block + '\n];' + src.slice(closer + 2);
fs.writeFileSync(GAMES_TS, src);
console.log(`registered ${fresh.length} new games in games.ts (skipped ${entries.length - fresh.length} already present)`);
