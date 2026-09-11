// Batch-verify mirrored duckmath games served EXACTLY as production will serve
// them: files/ mounted at /game/static/{slug}/ with NOTHING else — no _host
// fallback, no absolute-path escape hatch. Repairs what it can:
//   - misses under the game root are re-fetched from the origin
//   - ABSOLUTE-path misses (e.g. /assets/scripts/game.js — the snek-io false-
//     pass hole) are fetched from the origin host, saved into files/, and every
//     text file gets its "/seg/ refs rewritten to relative "seg/ so they
//     resolve against the game's bucket folder
//   - duckmath promo/ad injections are scrubbed from index.html, never mirrored
//   - misses that 404 on the origin too are optional (original site lacks them)
//   - service-worker registrations (sw.js) are optional
// A game passes when a render surface appears with no unrepairable misses and
// no requests back to the original hosts. Writes ~/duckmath-games/_bucketcheck.json.
//
// Usage: node scripts/duckmath-bucketcheck.mjs [--only a,b] [--concurrency 6]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';

const OUT = path.join(os.homedir(), 'duckmath-games');
const args = process.argv.slice(2);
const argOf = (k, d) => {
	const i = args.indexOf(k);
	return i >= 0 ? args[i + 1] : d;
};
const ONLY = argOf('--only', '').split(',').map((s) => s.trim()).filter(Boolean);
const CONCURRENCY = parseInt(argOf('--concurrency', '6'), 10);

const MIME = {
	'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
	'.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
	'.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
	'.wav': 'audio/wav', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.txt': 'text/plain',
	'.xml': 'application/xml', '.data': 'application/octet-stream', '.swf': 'application/x-shockwave-flash'
};
const PROMO = /\/assets\/promo\/|promo\.js|adsbygoogle|googlesyndication/;
const OPTIONAL = /(^|\/)(sw|service-?worker)\.js$|favicon\.ico$/;

const RECHECK = args.includes('--recheck'); // ignore saved per-game results
let slugs = fs.readdirSync(OUT).filter((s) => {
	if (ONLY.length && !ONLY.includes(s)) return false;
	const meta = path.join(OUT, s, 'meta.json');
	if (!fs.existsSync(meta)) return false;
	const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
	return m.done && !m.skipped && fs.existsSync(path.join(OUT, s, 'files', 'index.html'));
});
// Resumable: each game's verdict is saved to {slug}/bucketcheck.json so a killed
// run resumes where it left off. --recheck forces a fresh pass.
const savedResult = (s) => {
	const p = path.join(OUT, s, 'bucketcheck.json');
	if (!RECHECK && fs.existsSync(p)) {
		try {
			return JSON.parse(fs.readFileSync(p, 'utf8'));
		} catch {
			return null;
		}
	}
	return null;
};
const already = slugs.filter((s) => savedResult(s)).map((s) => savedResult(s));
const todo = slugs.filter((s) => !savedResult(s));
console.log(`bucket-checking ${slugs.length} games (${already.length} already verified, ${todo.length} to do)`);
slugs = todo;

// One server for all games: /game/static/{slug}/... -> {slug}/files/...
// Absolute-path requests (no /game/static prefix) are attributed to their game
// via the Referer header so they count as misses instead of vanishing.
const misses = new Map(); // slug -> [{rest, abs}]
const recordMiss = (slug, rest, abs) => {
	if (!slug || OPTIONAL.test(rest)) return;
	if (!misses.has(slug)) misses.set(slug, []);
	misses.get(slug).push({ rest, abs });
};
const srv = http.createServer((req, res) => {
	const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	const m = u.match(/^\/game\/static\/([^/]+)\/(.*)$/);
	if (m) {
		const [, slug, restRaw] = m;
		const rest = restRaw === '' ? 'index.html' : restRaw;
		const fp = path.join(OUT, slug, 'files', rest);
		if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
			res.setHeader('content-type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
			return fs.createReadStream(fp).pipe(res);
		}
		recordMiss(slug, rest, false);
	} else {
		// absolute-path request — attribute via referer
		const ref = req.headers.referer || '';
		const rm = ref.match(/\/game\/static\/([^/]+)\//);
		if (rm && !PROMO.test(u)) recordMiss(rm[1], u.replace(/^\//, ''), true);
	}
	res.statusCode = 404;
	res.end('missing');
});
await new Promise((r) => srv.listen(0, r));
const port = srv.address().port;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
let idx = 0;

const originOf = (slug) => {
	const meta = JSON.parse(fs.readFileSync(path.join(OUT, slug, 'meta.json'), 'utf8'));
	return { root: meta.gameRoot, origin: new URL(meta.gameRoot).origin };
};

async function fetchTo(url, fp) {
	try {
		const r = await fetch(url, { signal: AbortSignal.timeout(180000) });
		if (r.status === 404) return '404';
		if (!r.ok) return 'err' + r.status;
		const buf = Buffer.from(await r.arrayBuffer());
		fs.mkdirSync(path.dirname(fp), { recursive: true });
		fs.writeFileSync(fp, buf);
		return 'fetched';
	} catch {
		return 'unreachable';
	}
}

// Scrub duckmath promo/ad script+link tags from index.html (once per game).
function scrubPromo(slug) {
	const fp = path.join(OUT, slug, 'files', 'index.html');
	let html = fs.readFileSync(fp, 'utf8');
	const before = html;
	html = html.replace(/<script[^>]*(?:promo|adsbygoogle|googlesyndication)[^>]*>\s*<\/script>/gi, '');
	html = html.replace(/<link[^>]*\/assets\/promo\/[^>]*>/gi, '');
	if (html !== before) fs.writeFileSync(fp, html);
}

// Rewrite absolute "/seg/ refs to relative "seg/ across the game's text files
// so they resolve under /game/static/{slug}/.
function rewriteAbsRefs(slug, segments) {
	const filesDir = path.join(OUT, slug, 'files');
	const walk = (d) =>
		fs.readdirSync(d).flatMap((n) => {
			const fp = path.join(d, n);
			return fs.statSync(fp).isDirectory() ? walk(fp) : [fp];
		});
	let rewrites = 0;
	for (const fp of walk(filesDir)) {
		if (!/\.(html?|js|css|json)$/i.test(fp)) continue;
		let txt = fs.readFileSync(fp, 'utf8');
		const before = txt;
		for (const seg of segments) {
			txt = txt.split(`"/${seg}/`).join(`"${seg}/`);
			txt = txt.split(`'/${seg}/`).join(`'${seg}/`);
			txt = txt.split(`(/${seg}/`).join(`(${seg}/`);
			txt = txt.split(`=/${seg}/`).join(`=${seg}/`);
		}
		if (txt !== before) {
			fs.writeFileSync(fp, txt);
			rewrites++;
		}
	}
	return rewrites;
}

async function checkOne(slug, waitMs = 8000) {
	misses.set(slug, []);
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	const page = await ctx.newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
	const externals = [];
	page.on('request', (r) => {
		const u = r.url();
		if (/^https?:/.test(u) && !u.startsWith('http://localhost') && /db2\.duckmath|classroomlesson|duckmath\.org/.test(u)) externals.push(u);
	});
	let navError = null;
	try {
		await page.goto(`http://localhost:${port}/game/static/${slug}/index.html`, {
			waitUntil: 'domcontentloaded',
			timeout: 30000
		});
		await page.waitForTimeout(waitMs);
	} catch (e) {
		navError = String(e).slice(0, 150);
	}
	const surface = navError ? 0 : await page.locator('canvas, iframe, svg, #game, .game, img').count().catch(() => 0);
	const bodyText = navError ? '' : (await page.evaluate(() => document.body?.innerText?.slice(0, 100) || '').catch(() => ''));
	await ctx.close();
	const missList = [...new Map((misses.get(slug) || []).map((x) => [x.rest, x])).values()];
	const externalAssets = [...new Set(externals)];
	return { slug, navError, missList, externalAssets: externalAssets.slice(0, 5), extCount: externalAssets.length, surface, bodyText: bodyText.slice(0, 40), jsErrors: errors.slice(0, 3) };
}

async function processGame(slug) {
	scrubPromo(slug);
	let r = await checkOne(slug);
	let origin404 = [];
	let repaired = 0;
	// up to 2 repair rounds (a fetched JS can reveal new asset refs)
	for (let round = 0; round < 2 && !r.navError && r.missList.length; round++) {
		const { root, origin } = originOf(slug);
		const absSegs = new Set();
		for (const { rest, abs } of r.missList) {
			if (origin404.includes(rest)) continue;
			const url = abs ? origin + '/' + rest : root + rest;
			const res = await fetchTo(url, path.join(OUT, slug, 'files', rest));
			if (res === 'fetched') {
				repaired++;
				if (abs) absSegs.add(rest.split('/')[0]);
			} else if (res === '404') origin404.push(rest);
		}
		if (absSegs.size) rewriteAbsRefs(slug, [...absSegs]);
		r = await checkOne(slug);
		r.missList = r.missList.filter((m) => !origin404.includes(m.rest));
	}
	// slow loaders: retry once with a much longer wait before failing on surface
	if (!r.navError && !r.missList.length && !r.extCount && r.surface === 0 && !r.bodyText) {
		r = await checkOne(slug, 25000);
		r.missList = r.missList.filter((m) => !origin404.includes(m.rest));
	}
	const pass = !r.navError && r.missList.length === 0 && r.extCount === 0 && (r.surface > 0 || r.bodyText.length > 0);
	return { slug, pass, repaired, origin404: origin404.slice(0, 6), navError: r.navError, realMisses: r.missList.slice(0, 6).map((m) => m.rest), missCount: r.missList.length, externalAssets: r.externalAssets, surface: r.surface, jsErrors: r.jsErrors };
}

async function worker() {
	while (idx < slugs.length) {
		const slug = slugs[idx++];
		const n = idx;
		try {
			const r = await processGame(slug);
			results.push(r);
			fs.writeFileSync(path.join(OUT, slug, 'bucketcheck.json'), JSON.stringify(r, null, 1));
			if (n % 25 === 0 || !r.pass) console.log(`[${n}/${slugs.length}] ${slug}: ${r.pass ? 'PASS' : 'FAIL'}${r.pass ? '' : ' ' + JSON.stringify({ nav: r.navError, miss: r.realMisses, ext: r.externalAssets, surface: r.surface })}`);
		} catch (e) {
			const r = { slug, pass: false, navError: 'checker crash: ' + String(e).slice(0, 120) };
			results.push(r);
			fs.writeFileSync(path.join(OUT, slug, 'bucketcheck.json'), JSON.stringify(r, null, 1));
		}
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();
srv.close();

// Aggregate this run + all previously-saved verdicts.
const allResults = [...already, ...results];
const passing = allResults.filter((r) => r.pass).map((r) => r.slug);
fs.writeFileSync(path.join(OUT, '_bucketcheck.json'), JSON.stringify({ pass: passing, results: allResults }, null, 1));
console.log(`PASS ${passing.length}/${allResults.length}`);
