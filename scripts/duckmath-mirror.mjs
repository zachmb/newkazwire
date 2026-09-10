// Mirror every game offered on duckmath.org to a local folder.
//
// How it works: duckmath's app bundle embeds its full game DB (468 entries with
// title/link/categories/etc). Games are static bundles on db2.duckmath.org
// (S3+CloudFront) and classroomlesson.github.io (GitHub Pages). For each game we
// load it in headless Chrome and save EVERY network response from the game's
// origin to disk (this catches Unity .wasm/.data and JS-loaded assets that
// plain crawlers miss), plus fetch literal src/href refs from its HTML.
//
// Usage:
//   node scripts/duckmath-mirror.mjs --db /tmp/duckmath-games.json            # full run (resumable)
//   node scripts/duckmath-mirror.mjs --db ... --only snek-io,moto-x3m         # pilot subset
//   node scripts/duckmath-mirror.mjs --verify snek-io                         # re-serve + load check
//   OUT dir: ~/duckmath-games (override with --out)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';

const args = process.argv.slice(2);
const argOf = (k, d) => {
	const i = args.indexOf(k);
	return i >= 0 ? args[i + 1] : d;
};
const OUT = path.resolve(argOf('--out', path.join(os.homedir(), 'duckmath-games')));
const DB = argOf('--db', path.join(OUT, 'games.json'));
const ONLY = argOf('--only', '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);
const VERIFY = argOf('--verify', '');
const CONCURRENCY = parseInt(argOf('--concurrency', '3'), 10);
const CAPTURE_MS = parseInt(argOf('--capture-ms', '25000'), 10);

// Hosts that are embeds of other platforms, not downloadable static bundles.
const SKIP_HOSTS = new Set(['scratch.mit.edu', 'turbowarp.org', 'noclip.website']);
// Never save ad/analytics/tracker junk.
const JUNK = /googlesyndication|doubleclick|google-analytics|googletagmanager|adtrafficquality|api\.ipify\.org|cloudflareinsights/;

const slugOf = (g) =>
	(g.title || String(g.id))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

function urlToRelPath(u, gameRootPath) {
	const url = new URL(u);
	let p = decodeURIComponent(url.pathname);
	if (p.endsWith('/')) p += 'index.html';
	if (p.startsWith(gameRootPath)) return path.join('files', p.slice(gameRootPath.length));
	// same-origin shared asset outside the game folder (e.g. a shared engine)
	return path.join('_host', p.replace(/^\//, ''));
}

async function saveResponse(resp, dir, gameRootPath, saved) {
	try {
		const u = resp.url();
		if (!/^https?:/.test(u) || JUNK.test(u)) return;
		if (resp.status() !== 200) return;
		const rel = urlToRelPath(u, gameRootPath);
		if (rel.includes('..')) return;
		if (saved.has(rel)) return;
		const body = await resp.body().catch(() => null);
		if (!body || !body.length) return;
		const fp = path.join(dir, rel);
		fs.mkdirSync(path.dirname(fp), { recursive: true });
		fs.writeFileSync(fp, body);
		saved.set(rel, { url: u, bytes: body.length, type: resp.headers()['content-type'] || '' });
	} catch {
		/* single-asset failure shouldn't kill the game capture */
	}
}

// Pull literal relative src/href/url() refs out of captured HTML/JS/CSS and
// fetch any we didn't see on the wire (menus/levels not touched during capture).
function literalRefs(text) {
	const out = new Set();
	const re =
		/(?:src|href)\s*=\s*["']([^"'<>]+?)["']|url\(\s*["']?([^"')]+?)["']?\s*\)|["']([\w./-]+\.(?:png|jpe?g|webp|gif|svg|mp3|ogg|wav|json|wasm|data|js|css|glb|atlas|unityweb|br|bin|pak|swf))["']/gi;
	let m;
	while ((m = re.exec(text))) {
		const r = m[1] || m[2] || m[3];
		if (r && !/^(https?:|data:|blob:|javascript:|#|\/\/)/.test(r)) out.add(r);
	}
	return [...out];
}

async function fetchStaticRefs(gameRoot, dir, gameRootPath, saved) {
	// Scan by content-type OR extension — S3 serves some .json/.js as
	// application/octet-stream (that hid Unity's game.json dataUrl ref).
	const texts = [...saved.entries()].filter(
		([rel, v]) => /(html|javascript|css|json)/.test(v.type || '') || /\.(html?|js|css|json)$/.test(rel)
	);
	const queue = [];
	for (const [rel, v] of texts) {
		let txt;
		try {
			txt = fs.readFileSync(path.join(dir, rel), 'utf8');
		} catch {
			continue;
		}
		const baseUrl = v.url;
		for (const r of literalRefs(txt)) {
			try {
				const abs = new URL(r, baseUrl).toString();
				if (!abs.startsWith(new URL(gameRoot).origin)) continue;
				const relPath = urlToRelPath(abs, gameRootPath);
				if (!saved.has(relPath) && !relPath.includes('..')) queue.push(abs);
			} catch {
				/* bad ref */
			}
		}
	}
	let fetched = 0;
	for (const abs of [...new Set(queue)].slice(0, 400)) {
		try {
			// generous timeout: single Unity data files can be 20MB+
			const r = await fetch(abs, { signal: AbortSignal.timeout(180000) });
			if (!r.ok) continue;
			const buf = Buffer.from(await r.arrayBuffer());
			if (!buf.length) continue;
			const rel = urlToRelPath(abs, gameRootPath);
			const fp = path.join(OUT ? path.join(dir, rel) : rel);
			fs.mkdirSync(path.dirname(fp), { recursive: true });
			fs.writeFileSync(fp, buf);
			saved.set(rel, { url: abs, bytes: buf.length, type: r.headers.get('content-type') || '' });
			fetched++;
		} catch {
			/* unreachable ref — fine */
		}
	}
	return fetched;
}

async function mirrorGame(browser, game) {
	const slug = slugOf(game);
	const dir = path.join(OUT, slug);
	const metaPath = path.join(dir, 'meta.json');
	if (fs.existsSync(metaPath) && JSON.parse(fs.readFileSync(metaPath, 'utf8')).done) {
		return { slug, status: 'cached' };
	}
	const link = game.link;
	const host = new URL(link).host;
	if (SKIP_HOSTS.has(host)) {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(metaPath, JSON.stringify({ ...game, done: true, skipped: 'embed-platform' }, null, 1));
		return { slug, status: 'skipped-embed' };
	}

	// Game root = the link's folder. pre.html is an ad shell that iframes
	// ./index.html — enter through index.html directly when it exists.
	const gameRoot = link.replace(/[^/]*$/, '');
	const gameRootPath = new URL(gameRoot).pathname;
	let entry = link;
	if (/pre\.html$/.test(link)) {
		const idx = gameRoot + 'index.html';
		try {
			const h = await fetch(idx, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
			if (h.ok) entry = idx;
		} catch {
			/* keep pre.html */
		}
	}

	fs.mkdirSync(dir, { recursive: true });
	const saved = new Map();
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		serviceWorkers: 'block'
	});
	const page = await ctx.newPage();
	const pendingSaves = [];
	page.on('response', (r) => pendingSaves.push(saveResponse(r, dir, gameRootPath, saved)));

	let loadError = null;
	try {
		await page.goto(entry, { waitUntil: 'domcontentloaded', timeout: 45000 });
		await page.waitForTimeout(Math.min(8000, CAPTURE_MS));
		// Nudge lazily-loaded games: click common start affordances, then center.
		for (const sel of ['text=/^(play|start)/i', 'canvas', 'button']) {
			try {
				await page.locator(sel).first().click({ timeout: 1500, force: true });
			} catch {
				/* no such control */
			}
		}
		await page.waitForTimeout(Math.max(0, CAPTURE_MS - 12000));
		// Big engine payloads (Unity .data/.wasm) can still be streaming — wait
		// for the network to go quiet before tearing down.
		await page.waitForLoadState('networkidle', { timeout: 90000 }).catch(() => {});
	} catch (e) {
		loadError = String(e).slice(0, 200);
	}
	await Promise.allSettled(pendingSaves);
	await ctx.close();

	const extra = await fetchStaticRefs(gameRoot, dir, gameRootPath, saved).catch(() => 0);

	// Icon (thumbnail artwork)
	if (game.icon) {
		try {
			const r = await fetch(game.icon, { signal: AbortSignal.timeout(15000) });
			if (r.ok) fs.writeFileSync(path.join(dir, 'icon' + path.extname(new URL(game.icon).pathname)), Buffer.from(await r.arrayBuffer()));
		} catch {
			/* icon optional */
		}
	}

	const files = [...saved.entries()];
	const bytes = files.reduce((a, [, v]) => a + v.bytes, 0);
	const hasIndex = saved.has(path.join('files', 'index.html')) || files.some(([k]) => k.endsWith('.html'));
	const ok = files.length > 0 && hasIndex && !loadError;
	fs.writeFileSync(
		metaPath,
		JSON.stringify(
			{ ...game, slug, entry, gameRoot, done: ok, loadError, fileCount: files.length, extraStaticFetched: extra, bytes, capturedAt: new Date().toISOString() },
			null,
			1
		)
	);
	fs.writeFileSync(path.join(dir, '_capture.json'), JSON.stringify(Object.fromEntries(files), null, 1));
	return { slug, status: ok ? 'ok' : 'failed', files: files.length, mb: (bytes / 1e6).toFixed(1), loadError };
}

// --verify <slug>: serve the mirrored folder and load it headlessly; pass if a
// canvas/iframe renders and no missing-asset 404s hit our local server.
async function verify(slug) {
	const dir = path.join(OUT, slug);
	const filesDir = path.join(dir, 'files');
	if (!fs.existsSync(filesDir)) throw new Error('no mirror at ' + filesDir);
	const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
	const rootPath = new URL(meta.gameRoot).pathname;
	const misses = [];
	const srv = http.createServer((req, res) => {
		let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
		if (p.endsWith('/')) p += 'index.html';
		// map original absolute paths: under game root -> files/, else -> _host/
		const rel = p.startsWith(rootPath) ? path.join('files', p.slice(rootPath.length)) : path.join('_host', p.replace(/^\//, ''));
		const fp = path.join(dir, rel);
		if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
			if (/\.wasm$/.test(fp)) res.setHeader('content-type', 'application/wasm');
			if (/\.js$/.test(fp)) res.setHeader('content-type', 'text/javascript');
			if (/\.html$/.test(fp)) res.setHeader('content-type', 'text/html');
			res.end(fs.readFileSync(fp));
		} else {
			if (!/favicon\.ico$/.test(p)) misses.push(p);
			res.statusCode = 404;
			res.end('nope');
		}
	});
	await new Promise((r) => srv.listen(0, r));
	const port = srv.address().port;
	const browser = await chromium.launch({ channel: 'chrome', headless: true });
	const page = await (await browser.newContext()).newPage();
	const errors = [];
	page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
	await page.goto(`http://localhost:${port}${rootPath}index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForTimeout(9000);
	const hasSurface = (await page.locator('canvas, iframe, svg, #game, .game').count()) > 0;
	const shot = path.join(dir, 'verify.png');
	await page.screenshot({ path: shot });
	await browser.close();
	srv.close();
	console.log(`[verify ${slug}] surface=${hasSurface} localMisses=${misses.length} jsErrors=${errors.length} screenshot=${shot}`);
	if (misses.length) console.log('  missing:', [...new Set(misses)].slice(0, 10));
	if (errors.length) console.log('  errors:', errors.slice(0, 5));
	return hasSurface && misses.length === 0;
}

// ---- main
if (VERIFY) {
	const ok = await verify(VERIFY);
	process.exit(ok ? 0 : 1);
}

const games = JSON.parse(fs.readFileSync(DB, 'utf8'));
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'games.json'), JSON.stringify(games, null, 1));
let list = games;
if (ONLY.length) list = games.filter((g) => ONLY.includes(slugOf(g)));
console.log(`mirroring ${list.length} games -> ${OUT} (concurrency ${CONCURRENCY})`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
let idx = 0;
async function worker() {
	while (idx < list.length) {
		const g = list[idx++];
		const n = idx;
		try {
			const r = await mirrorGame(browser, g);
			results.push(r);
			console.log(`[${n}/${list.length}] ${r.slug}: ${r.status}${r.files ? ` (${r.files} files, ${r.mb}MB)` : ''}${r.loadError ? ' — ' + r.loadError : ''}`);
		} catch (e) {
			results.push({ slug: slugOf(g), status: 'crashed', err: String(e).slice(0, 200) });
			console.log(`[${n}/${list.length}] ${slugOf(g)}: CRASHED ${String(e).slice(0, 120)}`);
		}
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();

const by = (s) => results.filter((r) => r.status === s).length;
const summary = { total: results.length, ok: by('ok'), cached: by('cached'), failed: by('failed'), crashed: by('crashed'), skippedEmbed: by('skipped-embed') };
fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify({ summary, results }, null, 1));
console.log('DONE', JSON.stringify(summary));
