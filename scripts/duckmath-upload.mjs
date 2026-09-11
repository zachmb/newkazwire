// Upload bucket-check-passing duckmath mirrors to the frogbase bucket and emit
// the new games.ts entries. Resumable (per-game upload.json receipt); dedupes
// against the existing Kazwire library by slug and normalized title.
//
// Usage: node scripts/duckmath-upload.mjs [--only a,b] [--concurrency 12] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const OUT = path.join(os.homedir(), 'duckmath-games');
const args = process.argv.slice(2);
const argOf = (k, d) => {
	const i = args.indexOf(k);
	return i >= 0 ? args[i + 1] : d;
};
const ONLY = argOf('--only', '').split(',').map((s) => s.trim()).filter(Boolean);
const FILE_CONCURRENCY = parseInt(argOf('--concurrency', '12'), 10);
const DRY = args.includes('--dry');

// ---- Oracle FREE-TIER guard (Always Free: 20 GB storage, 50k requests/mo) ----
// Fail-closed pre-flight: query the LIVE bucket size and refuse to upload if it
// would push total storage past a safe ceiling below the 20 GB free-tier cap.
// The ceiling leaves headroom for user-generated AI games to keep growing.
const NAMESPACE = 'ax6lk2xbmw8z';
const BUCKET = 'frogbase';
const FREE_TIER_GB = 20;
const CEILING_GB = parseFloat(argOf('--ceiling-gb', '17')); // hard stop; 3 GB buffer
const MONTHLY_REQUEST_BUDGET = 50000;

function liveBucketBytes() {
	// execFileSync throws if oci is missing/unauthorized -> caller fails closed.
	const out = execFileSync(
		'oci',
		['os', 'bucket', 'get', '--bucket-name', BUCKET, '--namespace', NAMESPACE, '--fields', 'approximateSize', '--fields', 'approximateCount'],
		{ encoding: 'utf8', timeout: 60000 }
	);
	const d = JSON.parse(out).data;
	return { bytes: d['approximate-size'], count: d['approximate-count'] };
}

function localPayload(slugs) {
	let bytes = 0;
	let files = 0;
	for (const s of slugs) {
		const fp = path.join(OUT, s, 'files');
		if (fs.existsSync(fp)) {
			bytes += dirSize(fp);
			files += countFiles(fp);
		}
		for (const ext of ['.webp', '.png', '.jpg']) {
			const ic = path.join(OUT, s, 'icon' + ext);
			if (fs.existsSync(ic)) {
				bytes += fs.statSync(ic).size;
				files += 1;
				break;
			}
		}
	}
	return { bytes, files };
}
function countFiles(p) {
	let n = 0;
	for (const name of fs.readdirSync(p)) {
		const fp = path.join(p, name);
		n += fs.statSync(fp).isDirectory() ? countFiles(fp) : 1;
	}
	return n;
}

// Read+write PAR (same one oci.ts uses server-side).
const WRITE_PAR =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/WfZnDpcAp7J5E9byE9rDkZISyiMWqh2qtvMQupM2EaVSuzSqZJLtiUBcLnb4IBFA/n/ax6lk2xbmw8z/b/frogbase/o/';
const READ_CDN =
	'https://objectstorage.us-chicago-1.oraclecloud.com/p/Ey_EKMZKsDtoWiGaaYcsx2xvBjka1GJQFaeAXzdyVG1P2_so6AOygNF5EUiCXs5j/n/ax6lk2xbmw8z/b/frogbase/o';

const MIME = {
	'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
	'.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm',
	'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
	'.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
	'.wav': 'audio/wav', '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.txt': 'text/plain',
	'.xml': 'application/xml', '.swf': 'application/x-shockwave-flash'
};

const norm = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// --- dedupe: existing Kazwire library
const gamesTs = fs.readFileSync('src/lib/data/games.ts', 'utf8');
const existingSlugs = new Set([...gamesTs.matchAll(/"href":\s*"\/g\/([^"]+)"/g)].map((m) => m[1]));
const existingTitles = new Set([...gamesTs.matchAll(/"title":\s*"([^"]+)"/g)].map((m) => norm(m[1])));

// --- candidates: bucket-check passers minus Zach's exclusions
// (no FreezeNova-developed games; no site-proprietary games — only games also
// found elsewhere online, per _exclusions.json built from catalog corpora +
// web verification)
const check = JSON.parse(fs.readFileSync(path.join(OUT, '_bucketcheck.json'), 'utf8'));
const exclusions = JSON.parse(fs.readFileSync(path.join(OUT, '_exclusions.json'), 'utf8'));
const excludedSet = new Set(exclusions.excluded.map((e) => e.slug));
let candidates = check.pass.filter((s) => (ONLY.length ? ONLY.includes(s) : true));
const excludedHit = candidates.filter((s) => excludedSet.has(s));
candidates = candidates.filter((s) => !excludedSet.has(s));
console.log(`excluded by policy: ${excludedHit.length} (${excludedHit.slice(0, 10).join(', ')}${excludedHit.length > 10 ? '…' : ''})`);
const skippedDupes = [];
candidates = candidates.filter((slug) => {
	const meta = JSON.parse(fs.readFileSync(path.join(OUT, slug, 'meta.json'), 'utf8'));
	if (existingSlugs.has(slug) || existingTitles.has(norm(meta.title)) || existingTitles.has(norm(slug))) {
		skippedDupes.push(slug);
		return false;
	}
	return true;
});
console.log(`candidates: ${candidates.length} new (${skippedDupes.length} already on the site: ${skippedDupes.slice(0, 12).join(', ')}${skippedDupes.length > 12 ? '…' : ''})`);

// ---- FREE-TIER PRE-FLIGHT (fail-closed) --------------------------------------
// Only count games not already uploaded (receipts) toward the projection so a
// resumed run measures the REMAINING payload, not the whole set again.
const notYetUploaded = candidates.filter((s) => {
	const rp = path.join(OUT, s, 'upload.json');
	return !(fs.existsSync(rp) && JSON.parse(fs.readFileSync(rp, 'utf8')).uploaded);
});
const payload = localPayload(notYetUploaded);
let live;
try {
	live = liveBucketBytes();
} catch (e) {
	console.error(`\n✗ FREE-TIER GUARD: cannot read live bucket size via OCI CLI (${String(e).slice(0, 80)}).`);
	console.error('  Refusing to upload without verifying we stay under the 20 GB free tier. Fix OCI auth or pass --force-unsafe.');
	if (!args.includes('--force-unsafe')) process.exit(1);
	live = { bytes: 0, count: 0 };
}
const projectedGB = (live.bytes + payload.bytes) / 1e9;
const currentGB = live.bytes / 1e9;
console.log(
	`\nFREE-TIER CHECK (Oracle Always Free: ${FREE_TIER_GB} GB storage, ${MONTHLY_REQUEST_BUDGET.toLocaleString()} req/mo):\n` +
		`  bucket now:   ${currentGB.toFixed(2)} GB, ${live.count.toLocaleString()} objects\n` +
		`  this upload:  +${(payload.bytes / 1e9).toFixed(2)} GB, ${payload.files.toLocaleString()} files (= ${payload.files.toLocaleString()} PUT requests, one-time)\n` +
		`  projected:    ${projectedGB.toFixed(2)} GB / ${FREE_TIER_GB} GB  (ceiling ${CEILING_GB} GB)\n` +
		`  request note: one-time PUTs are ${((payload.files / MONTHLY_REQUEST_BUDGET) * 100).toFixed(0)}% of the monthly request budget.`
);
if (projectedGB > CEILING_GB) {
	console.error(
		`\n✗ FREE-TIER GUARD: projected ${projectedGB.toFixed(2)} GB would exceed the ${CEILING_GB} GB safety ceiling ` +
			`(20 GB free-tier cap). Aborting. Reduce the batch (--only ...) or raise --ceiling-gb deliberately.`
	);
	process.exit(1);
}
console.log(`  ✓ within free tier — ${(CEILING_GB - projectedGB).toFixed(2)} GB headroom under the safety ceiling.\n`);
if (DRY) process.exit(0);

async function putObject(objectPath, buf, type, tries = 3) {
	for (let i = 0; i < tries; i++) {
		try {
			const r = await fetch(WRITE_PAR + objectPath.split('/').map(encodeURIComponent).join('/'), {
				method: 'PUT',
				headers: { 'content-type': type },
				body: buf,
				signal: AbortSignal.timeout(300000)
			});
			if (r.ok) return true;
			if (i === tries - 1) throw new Error(`PUT ${objectPath} -> ${r.status}`);
		} catch (e) {
			if (i === tries - 1) throw e;
			await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
		}
	}
}

function walk(dir, base = '') {
	const out = [];
	for (const name of fs.readdirSync(dir)) {
		const fp = path.join(dir, name);
		const rel = base ? base + '/' + name : name;
		if (fs.statSync(fp).isDirectory()) out.push(...walk(fp, rel));
		else out.push(rel);
	}
	return out;
}

// Map duckmath category words -> Kazwire-style Title Case tags.
const TAG_MAP = {
	'2d': '2D', '3d': '3D', io: 'IO', rpg: 'RPG', fps: 'Shooter', ai: 'AI',
	brainrot: 'Casual', new: null, popular: null, featured: null, roblox: 'Casual',
	horor: 'Horror'
};
const toTags = (categories) => {
	const seen = new Set();
	const tags = [];
	for (const raw of (categories || '').split(/\s+/).filter(Boolean)) {
		const mapped = raw in TAG_MAP ? TAG_MAP[raw] : raw[0].toUpperCase() + raw.slice(1);
		if (mapped && !seen.has(mapped)) {
			seen.add(mapped);
			tags.push(mapped);
		}
		if (tags.length >= 5) break;
	}
	return tags.length ? tags : ['Casual'];
};
const toTitle = (slug, title) =>
	(title || slug)
		.replace(/-/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.trim();

async function uploadGame(slug) {
	const dir = path.join(OUT, slug);
	const receiptPath = path.join(dir, 'upload.json');
	const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
	if (fs.existsSync(receiptPath) && JSON.parse(fs.readFileSync(receiptPath, 'utf8')).uploaded) {
		return { slug, status: 'cached' };
	}
	const filesDir = path.join(dir, 'files');
	const rels = walk(filesDir);
	let done = 0;
	let qi = 0;
	const errs = [];
	async function fileWorker() {
		while (qi < rels.length) {
			const rel = rels[qi++];
			try {
				const buf = fs.readFileSync(path.join(filesDir, rel));
				await putObject(`game/static/${slug}/${rel}`, buf, MIME[path.extname(rel).toLowerCase()] || 'application/octet-stream');
				done++;
			} catch (e) {
				errs.push(rel + ': ' + String(e).slice(0, 120));
			}
		}
	}
	await Promise.all(Array.from({ length: FILE_CONCURRENCY }, fileWorker));

	// thumbnail
	let image = null;
	for (const ext of ['.webp', '.png', '.jpg']) {
		const ip = path.join(dir, 'icon' + ext);
		if (fs.existsSync(ip)) {
			await putObject(`game/img/${slug}${ext}`, fs.readFileSync(ip), MIME[ext]);
			image = `${slug}${ext}`;
			break;
		}
	}

	if (errs.length) {
		fs.writeFileSync(receiptPath, JSON.stringify({ uploaded: false, errs }, null, 1));
		return { slug, status: 'failed', errs: errs.slice(0, 3) };
	}

	// verify the entry file is actually readable through the read PAR
	const head = await fetch(`${READ_CDN}/game/static/${slug}/index.html`, { method: 'HEAD' });
	if (!head.ok) {
		fs.writeFileSync(receiptPath, JSON.stringify({ uploaded: false, errs: ['read-verify ' + head.status] }, null, 1));
		return { slug, status: 'failed', errs: ['read-verify ' + head.status] };
	}

	const entry = {
		title: toTitle(slug, meta.title),
		image: image || `${slug}.webp`,
		href: `/g/${slug}`,
		description:
			(meta.desc && !/^Game provided by developer/.test(meta.desc) ? meta.desc + '\n\n' : '') +
			(meta.controls ? 'How to Play:\n' + String(meta.controls).split('\n').map((l) => '- ' + l.trim()).filter((l) => l !== '- ').join('\n') : 'Play free in your browser — no download needed.'),
		tags: toTags(meta.categories)
	};
	fs.writeFileSync(receiptPath, JSON.stringify({ uploaded: true, files: done, image, entry }, null, 1));

	// Free disk: the game is now in the bucket AND read-verified there, so the
	// local copy is dead weight. Drop the heavy artifacts (files/, _host/,
	// capture manifest, verify screenshot) but keep meta.json + upload.json +
	// icon so registration, dedupe, and resumability still work. Set
	// KEEP_LOCAL=1 to retain everything. Re-mirroring is possible if ever needed.
	let freedBytes = 0;
	if (!process.env.KEEP_LOCAL) {
		for (const rel of ['files', '_host', '_capture.json', 'verify.png']) {
			const fp = path.join(dir, rel);
			try {
				if (fs.existsSync(fp)) {
					freedBytes += dirSize(fp);
					fs.rmSync(fp, { recursive: true, force: true });
				}
			} catch {
				/* purge is best-effort; never fail an upload over cleanup */
			}
		}
	}
	return { slug, status: 'ok', files: done, freedMB: +(freedBytes / 1e6).toFixed(1) };
}

function dirSize(p) {
	const st = fs.statSync(p);
	if (st.isFile()) return st.size;
	let total = 0;
	for (const name of fs.readdirSync(p)) total += dirSize(path.join(p, name));
	return total;
}

const results = [];
let gi = 0;
async function gameWorker() {
	while (gi < candidates.length) {
		const slug = candidates[gi++];
		const n = gi;
		try {
			const r = await uploadGame(slug);
			results.push(r);
			console.log(`[${n}/${candidates.length}] ${slug}: ${r.status}${r.files ? ` (${r.files} files${r.freedMB ? `, freed ${r.freedMB}MB` : ''})` : ''}${r.errs ? ' ' + r.errs.join(' | ') : ''}`);
		} catch (e) {
			results.push({ slug, status: 'crashed', err: String(e).slice(0, 150) });
			console.log(`[${n}/${candidates.length}] ${slug}: CRASHED ${String(e).slice(0, 120)}`);
		}
	}
}
await Promise.all(Array.from({ length: 3 }, gameWorker));

const ok = results.filter((r) => r.status === 'ok' || r.status === 'cached');
const entries = ok
	.map((r) => JSON.parse(fs.readFileSync(path.join(OUT, r.slug, 'upload.json'), 'utf8')).entry)
	.filter(Boolean);
fs.writeFileSync(path.join(OUT, '_new-games.json'), JSON.stringify(entries, null, 1));
console.log(`DONE uploaded=${ok.length} failed=${results.length - ok.length} -> _new-games.json (${entries.length} entries)`);
