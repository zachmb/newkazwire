// Cache-proof safety net for the frame-buster. Even after we blank game.js,
// users who already CACHED the old buster game.js keep getting redirected to
// ./pre.html (which 404s -> ObjectNotFound). Oracle sets no Cache-Control, so
// browsers cache the old script heuristically for a while.
//
// Fix: give every affected game a real pre.html (and pre-gg.html) that just
// iframes ./index.html?school=1 SAME-ORIGIN. The buster only fires when a game
// is embedded CROSS-domain; same-origin (pre.html -> index.html, both in the
// bucket) it returns early, so the game plays. ?school=1 is belt-and-suspenders
// (the buster honors it as a no-redirect flag). No loop, no 404, cache or not.
//
// Free-tier metered. Only writes tiny HTML files (storage-negligible).
//   node scripts/duckmath-fix-prehtml.mjs            # all games that have a game.js buster file
//   node scripts/duckmath-fix-prehtml.mjs --all      # every static game (max safety)
//   node scripts/duckmath-fix-prehtml.mjs --verify N # also iframe-verify N pre.html play
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WRITE_PAR =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/WfZnDpcAp7J5E9byE9rDkZISyiMWqh2qtvMQupM2EaVSuzSqZJLtiUBcLnb4IBFA/n/ax6lk2xbmw8z/b/frogbase/o/';
const READ =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/Ey_EKMZKsDtoWiGaaYcsx2xvBjka1GJQFaeAXzdyVG1P2_so6AOygNF5EUiCXs5j/n/ax6lk2xbmw8z/b/frogbase/o';

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const VERIFY = args.includes('--verify') ? parseInt(args[args.indexOf('--verify') + 1] || '20', 10) : 0;
const ONLY = (args.includes('--only') ? args[args.indexOf('--only') + 1] : '').split(',').map((s) => s.trim()).filter(Boolean);
const MONTHLY = 50000;
let GETS = 0, PUTS = 0;

const PRE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Game</title><style>html,body{margin:0;padding:0;height:100%;width:100%;overflow:hidden;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="./index.html?school=1" allow="autoplay; fullscreen; gamepad; clipboard-write; clipboard-read; accelerometer; gyroscope" allowfullscreen></iframe></body></html>`;

async function bput(objPath, body, type) {
	PUTS++;
	const r = await fetch(WRITE_PAR + objPath.split('/').map(encodeURIComponent).join('/'), {
		method: 'PUT',
		headers: { 'content-type': type, 'cache-control': 'public, max-age=300' },
		body,
		signal: AbortSignal.timeout(60000)
	});
	if (!r.ok) throw new Error('PUT ' + objPath + ' -> ' + r.status);
}

const src = fs.readFileSync('src/lib/data/games.ts', 'utf8');
const games = eval(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
let slugs = games.map((g) => g.href.split('/').pop()).filter(Boolean);
if (ONLY.length) slugs = slugs.filter((s) => ONLY.includes(s));
console.log(`pre.html safety net over ${slugs.length} games${ALL ? ' [ALL static]' : ' [only games with a game.js buster]'}`);

// Decide which games need pre.html: those with a game.js (the buster wrapper),
// unless --all. HEAD is cheap.
const targets = [];
let qi = 0;
async function pick() {
	while (qi < slugs.length) {
		const s = slugs[qi++];
		if (ALL) {
			GETS++;
			const idx = await fetch(`${READ}/game/static/${s}/index.html`, { method: 'HEAD' }).catch(() => null);
			if (idx && idx.ok) targets.push(s);
			continue;
		}
		GETS++;
		const gj = await fetch(`${READ}/game/static/${s}/assets/scripts/game.js`, { method: 'HEAD' }).catch(() => null);
		if (gj && gj.ok) targets.push(s);
	}
}
await Promise.all(Array.from({ length: 12 }, pick));
console.log(`targets needing pre.html: ${targets.length}`);

let done = 0, failed = [];
let wi = 0;
async function writer() {
	while (wi < targets.length) {
		const s = targets[wi++];
		try {
			await bput(`game/static/${s}/pre.html`, PRE_HTML, 'text/html');
			await bput(`game/static/${s}/pre-gg.html`, PRE_HTML, 'text/html');
			done++;
			if (done % 40 === 0) console.log(`  ${done}/${targets.length} pre.html written`);
		} catch (e) {
			failed.push(s + ': ' + String(e).slice(0, 60));
		}
	}
}
await Promise.all(Array.from({ length: 8 }, writer));
console.log(`\nDONE: ${done}/${targets.length} games got pre.html + pre-gg.html | ${failed.length} failed`);
if (failed.length) console.log('failed:', failed.slice(0, 10));
console.log(`bucket requests: ${GETS} GET + ${PUTS} PUT = ${GETS + PUTS} (${(((GETS + PUTS) / MONTHLY) * 100).toFixed(1)}% of monthly free tier)`);

// Verify: load pre.html itself in a cross-domain iframe (simulating a cached
// buster redirect) and confirm the game plays (nested index.html frame present,
// no further pre.html error).
if (VERIFY > 0) {
	const sample = targets.slice(0, VERIFY);
	console.log(`\nVERIFY: loading pre.html for ${sample.length} games in a cross-domain iframe (simulates cached-buster redirect):`);
	fs.writeFileSync('/tmp/kz-pre-harness.html', '<!doctype html><meta charset=utf8><body style=margin:0><iframe id=f style="width:900px;height:640px;border:0"></iframe>');
	const browser = await chromium.launch({ channel: 'chrome', headless: true });
	const page = await (await browser.newContext({ viewport: { width: 920, height: 660 } })).newPage();
	let ok = 0;
	const bad = [];
	for (const s of sample) {
		const errs = [];
		const on = (r) => { if (new RegExp(`game/static/${s}/pre(?:-gg)?\\.html`).test(r.url()) && r.status() === 404) errs.push('pre404'); };
		page.on('response', on);
		try {
			await page.goto('file:///tmp/kz-pre-harness.html', { waitUntil: 'domcontentloaded' });
			await page.evaluate((u) => { document.getElementById('f').src = u; }, `${READ}/game/static/${s}/pre.html`);
			await page.waitForTimeout(4500);
			// the game's index.html should be present as a nested frame, and no pre 404
			const hasIndex = page.frames().some((f) => f.url().includes(`game/static/${s}/index.html`));
			const good = hasIndex && !errs.length;
			if (good) ok++; else bad.push(s);
			console.log(`  ${s}: ${good ? 'PLAYS via pre.html' : 'FAIL'}`);
		} catch (e) {
			bad.push(s + ' (err)');
		}
		page.off('response', on);
	}
	await browser.close();
	console.log(`\nVERIFY: ${ok}/${sample.length} play through pre.html${bad.length ? '; FAIL: ' + bad.join(', ') : ''}`);
}
