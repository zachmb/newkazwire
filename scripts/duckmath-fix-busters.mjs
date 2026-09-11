// Detect + neutralize the duckmath/FreezeNova frame-buster that redirects a
// cross-domain-embedded game to ./pre.html (or ./pre-gg.html) — which 404s in
// our bucket (ObjectNotFound) and breaks the game in the kazwire player.
//
// FREE-TIER SAFE: detection is STATIC (fetch index.html + its same-origin
// scripts and regex-match the buster — ~2-5 GETs/game), NOT a full iframe
// render (which would pull every game's whole asset set = tens of thousands of
// GETs against the 50k/mo Oracle cap). A full cross-domain iframe PLAY test is
// run only on a small --sample to confirm the static fix really works. Every
// bucket request the tool makes is counted and printed; blanking a script only
// SHRINKS storage, so this never grows the bucket.
//
// Usage:
//   node scripts/duckmath-fix-busters.mjs                 # static scan + fix all, then iframe-verify sample
//   node scripts/duckmath-fix-busters.mjs --scan-only     # report, no writes
//   node scripts/duckmath-fix-busters.mjs --sample 25     # iframe-verify N games (default 20)
//   node scripts/duckmath-fix-busters.mjs --only slug,slug
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WRITE_PAR =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/WfZnDpcAp7J5E9byE9rDkZISyiMWqh2qtvMQupM2EaVSuzSqZJLtiUBcLnb4IBFA/n/ax6lk2xbmw8z/b/frogbase/o/';
const READ =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/Ey_EKMZKsDtoWiGaaYcsx2xvBjka1GJQFaeAXzdyVG1P2_so6AOygNF5EUiCXs5j/n/ax6lk2xbmw8z/b/frogbase/o';

const args = process.argv.slice(2);
const argOf = (k, d) => {
	const i = args.indexOf(k);
	return i >= 0 ? args[i + 1] : d;
};
const ONLY = argOf('--only', '').split(',').map((s) => s.trim()).filter(Boolean);
const SCAN_ONLY = args.includes('--scan-only');
const VERIFY_ALL = args.includes('--verify-all'); // real iframe test of EVERY game, heavy assets blocked
const CONCURRENCY = parseInt(argOf('--concurrency', '8'), 10);
const SAMPLE = parseInt(argOf('--sample', '20'), 10);
const MONTHLY_BUDGET = 50000;
const OUT = path.join(os.homedir(), 'duckmath-games');

// buster signatures in a script body or inline <script>
const BUSTER = /pre(?:-gg)?\.html|isInIframeAndSameDomain|location\.href\s*=\s*['"]\.?\/?pre/i;

// self-metering: every bucket request the tool makes
let GETS = 0, PUTS = 0;
async function bget(url, timeout = 30000) {
	GETS++;
	return fetch(url, { signal: AbortSignal.timeout(timeout) });
}
async function bput(objPath, body, type) {
	PUTS++;
	const r = await fetch(WRITE_PAR + objPath.split('/').map(encodeURIComponent).join('/'), {
		method: 'PUT',
		headers: { 'content-type': type },
		body,
		signal: AbortSignal.timeout(120000)
	});
	if (!r.ok) throw new Error('PUT ' + objPath + ' -> ' + r.status);
}

const src = fs.readFileSync('src/lib/data/games.ts', 'utf8');
const games = eval(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
let slugs = games.map((g) => g.href.split('/').pop()).filter(Boolean);
if (ONLY.length) slugs = slugs.filter((s) => ONLY.includes(s));

// --- VERIFY-ALL: real cross-domain iframe test of EVERY game, but block heavy
// assets (images/media/fonts/wasm/data) so the buster script still runs and
// redirects if present, while we download only ~html+js. ~5 requests/game.
if (VERIFY_ALL) {
	console.log(`VERIFY-ALL: real iframe redirect test over ${slugs.length} games (heavy assets blocked, request-frugal)`);
	fs.writeFileSync('/tmp/kz-iframe-harness.html', '<!doctype html><meta charset=utf8><body style=margin:0><iframe id=f style="width:800px;height:600px;border:0"></iframe>');
	const browser = await chromium.launch({ channel: 'chrome', headless: true });
	const vres = [];
	let vi = 0;
	async function vworker() {
		const ctx = await browser.newContext({ viewport: { width: 820, height: 620 } });
		// block everything except the document + scripts + styles of the game
		await ctx.route('**/*', (route) => {
			const t = route.request().resourceType();
			if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet' || t === 'websocket') return route.abort();
			// block big binary game payloads
			const u = route.request().url();
			if (/\.(wasm|data|unityweb|mp3|ogg|wav|mp4|png|jpe?g|webp|gif|br|bin|pak|atlas)(\?|$)/i.test(u)) return route.abort();
			route.continue();
		});
		const page = await ctx.newPage();
		while (vi < slugs.length) {
			const slug = slugs[vi++];
			const n = vi;
			const bad = [];
			const onResp = (r) => { if (new RegExp(`game/static/${slug}/pre(?:-gg)?\\.html`).test(r.url())) bad.push('redirect'); };
			page.on('response', onResp);
			try {
				const head = await bget(`${READ}/game/static/${slug}/index.html`, 15000).then((r) => r).catch(() => null);
				if (!head || !head.ok) { vres.push({ slug, ok: true, skip: 'non-static' }); page.off('response', onResp); continue; }
				await page.goto('file:///tmp/kz-iframe-harness.html', { waitUntil: 'domcontentloaded' });
				await page.evaluate((s) => { document.getElementById('f').src = s; }, `${READ}/game/static/${slug}/index.html`);
				await page.waitForTimeout(4000);
				GETS += 4; // rough: html+js the game pulled through (heavy assets blocked)
				const frameUrl = page.frames().map((f) => f.url()).find((u) => u.includes(`game/static/${slug}/`)) || '';
				const redirected = /pre(?:-gg)?\.html/.test(frameUrl) || bad.length > 0;
				vres.push({ slug, ok: !redirected, reason: redirected ? 'redirects->pre.html' : '' });
				if (redirected || n % 60 === 0) console.log(`[${n}/${slugs.length}] ${slug}: ${redirected ? 'STILL REDIRECTS' : 'ok'}`);
			} catch (e) {
				vres.push({ slug, ok: false, reason: 'err:' + String(e).slice(0, 40) });
			}
			page.off('response', onResp);
		}
		await ctx.close();
	}
	await Promise.all(Array.from({ length: Math.min(6, CONCURRENCY) }, vworker));
	await browser.close();
	const bad = vres.filter((v) => !v.ok);
	fs.writeFileSync(path.join(OUT, '_verifyall.json'), JSON.stringify(vres, null, 1));
	console.log(`\nVERIFY-ALL DONE: ${vres.length} games | ${vres.length - bad.length} play | ${bad.length} still redirect${bad.length ? ': ' + bad.map((b) => b.slug).slice(0, 40).join(', ') : ''}`);
	console.log(`bucket requests this run: ~${GETS} GET (est.) (${((GETS / MONTHLY_BUDGET) * 100).toFixed(1)}% of monthly free tier)`);
	process.exit(bad.length ? 1 : 0);
}

console.log(`STATIC buster scan over ${slugs.length} games${SCAN_ONLY ? ' [SCAN ONLY]' : ''} (request-frugal)`);

// Static scan+fix one game. Returns {slug, hadBuster, fixed, note, missing}.
async function scanFix(slug) {
	const base = `${READ}/game/static/${slug}/`;
	let idxRes;
	try {
		idxRes = await bget(base + 'index.html');
	} catch {
		return { slug, missing: 'index unreadable' };
	}
	if (idxRes.status === 404) return { slug, nonStatic: true };
	if (!idxRes.ok) return { slug, missing: 'index ' + idxRes.status };
	const html = await idxRes.text();
	const actions = [];
	let hadBuster = false;

	// 1) same-origin external scripts referenced by index.html
	const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
	for (const s of scriptSrcs) {
		if (/^https?:|^\/\//.test(s)) continue; // external/CDN — leave
		const rel = s.replace(/^\.?\//, '');
		let body;
		try {
			const r = await bget(base + rel);
			if (!r.ok) continue;
			body = await r.text();
		} catch {
			continue;
		}
		if (BUSTER.test(body)) {
			hadBuster = true;
			if (!SCAN_ONLY) await bput(`game/static/${slug}/${rel}`, '/* frame-buster neutralized for cross-domain iframe embedding */\n', 'text/javascript');
			actions.push('blanked ' + rel);
		}
	}

	// 2) inline buster <script> blocks
	const newHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => (BUSTER.test(m) && !/\ssrc=/i.test(m) ? '<!-- inline frame-buster removed -->' : m));
	if (newHtml !== html) {
		hadBuster = true;
		if (!SCAN_ONLY) await bput(`game/static/${slug}/index.html`, newHtml, 'text/html');
		actions.push('stripped inline buster');
	}

	return { slug, hadBuster, fixed: actions.length > 0, note: actions.join('; ') };
}

const results = [];
let idx = 0;
async function worker() {
	while (idx < slugs.length) {
		const slug = slugs[idx++];
		const n = idx;
		try {
			const r = await scanFix(slug);
			results.push(r);
			if (r.hadBuster || r.missing || n % 60 === 0)
				console.log(`[${n}/${slugs.length}] ${slug}: ${r.nonStatic ? 'non-static' : r.missing ? 'MISSING ' + r.missing : r.hadBuster ? (r.fixed ? 'FIXED (' + r.note + ')' : 'buster (scan-only)') : 'clean'}`);
		} catch (e) {
			results.push({ slug, error: String(e).slice(0, 100) });
			console.log(`[${n}/${slugs.length}] ${slug}: ERROR ${String(e).slice(0, 80)}`);
		}
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const withBuster = results.filter((r) => r.hadBuster);
const fixed = results.filter((r) => r.fixed);
const missing = results.filter((r) => r.missing || r.error);
console.log(`\nSTATIC SCAN DONE: ${results.length} games | ${withBuster.length} had buster | ${fixed.length} fixed | ${missing.length} missing/error`);
console.log(`bucket requests used so far: ${GETS} GET + ${PUTS} PUT = ${GETS + PUTS} (${(((GETS + PUTS) / MONTHLY_BUDGET) * 100).toFixed(1)}% of ${MONTHLY_BUDGET}/mo)`);

// --- Real cross-domain iframe PLAY verification on a small sample (frugal).
// Prioritize just-fixed games + a spread of others.
const verifyList = [...new Set([...fixed.map((r) => r.slug).slice(0, Math.ceil(SAMPLE / 2)), ...slugs])].slice(0, SAMPLE);
if (SAMPLE > 0 && verifyList.length) {
	console.log(`\nIFRAME PLAY VERIFY (frugal sample of ${verifyList.length}):`);
	fs.writeFileSync('/tmp/kz-iframe-harness.html', '<!doctype html><meta charset=utf8><body style=margin:0><iframe id=f style="width:1000px;height:700px;border:0" allow="autoplay; fullscreen; gamepad"></iframe>');
	const browser = await chromium.launch({ channel: 'chrome', headless: true });
	const page = await (await browser.newContext({ viewport: { width: 1040, height: 740 } })).newPage();
	const vres = [];
	for (const slug of verifyList) {
		const bad = [];
		const onResp = (r) => {
			const u = r.url();
			if (new RegExp(`game/static/${slug}/pre(?:-gg)?\\.html`).test(u)) bad.push('redirect');
		};
		page.on('response', onResp);
		try {
			await page.goto('file:///tmp/kz-iframe-harness.html', { waitUntil: 'domcontentloaded' });
			await page.evaluate((s) => { document.getElementById('f').src = s; }, `${READ}/game/static/${slug}/index.html`);
			await page.waitForTimeout(6500);
			const frameUrl = page.frames().map((f) => f.url()).find((u) => u.includes(`game/static/${slug}/`)) || '';
			const onPre = /pre(?:-gg)?\.html/.test(frameUrl);
			const ok = !onPre && !bad.length;
			vres.push({ slug, ok });
			console.log(`  ${slug}: ${ok ? 'PLAYS' : 'STILL REDIRECTS'}`);
		} catch (e) {
			vres.push({ slug, ok: false, err: String(e).slice(0, 50) });
			console.log(`  ${slug}: verify-error ${String(e).slice(0, 40)}`);
		}
		page.off('response', onResp);
	}
	await browser.close();
	const stillBad = vres.filter((v) => !v.ok);
	console.log(`\nVERIFY: ${vres.length - stillBad.length}/${vres.length} play; ${stillBad.length} still redirect${stillBad.length ? ': ' + stillBad.map((v) => v.slug).join(', ') : ''}`);
	fs.writeFileSync(path.join(OUT, '_bustercheck.json'), JSON.stringify({ scan: results, verify: vres, requests: { GETS, PUTS } }, null, 1));
}
console.log(`\nTOTAL bucket requests this run: ${GETS} GET + ${PUTS} PUT = ${GETS + PUTS} (one-time, ${(((GETS + PUTS) / MONTHLY_BUDGET) * 100).toFixed(1)}% of monthly free tier)`);
