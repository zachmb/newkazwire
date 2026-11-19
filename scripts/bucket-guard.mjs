// Single source of truth for the Oracle `frogbase` free-tier guard.
//
// Oracle Always Free Object Storage gives you 20 GB of storage and 50,000 API
// requests/month. Going over bills real money on an upgraded/PAYG account, so
// EVERY script that writes to the bucket must pass through here first. The guard
// is FAIL-CLOSED: if it can't read the live bucket size (OCI auth down, CLI
// missing), it refuses the write rather than risk blowing past the cap.
//
// Usage from an uploader:
//   import { enforceRoom } from './bucket-guard.mjs';
//   enforceRoom(payloadBytes, { addFiles, label: 'duckmath-upload' });  // throws/exits on no-go
import { execFileSync } from 'node:child_process';

export const NAMESPACE = 'ax6lk2xbmw8z';
export const BUCKET = 'frogbase';
export const FREE_TIER_GB = 20;            // Oracle Always Free storage cap
export const MONTHLY_REQUEST_BUDGET = 50000; // Oracle Always Free requests/month
// Hard stop BELOW the real cap so a size-estimate miss, replication lag, or a
// racing writer can never tip us over 20 GB. Override per-call or via env.
export const DEFAULT_CEILING_GB = parseFloat(process.env.KAZWIRE_BUCKET_CEILING_GB || '17');

const GB = 1e9; // storage/billing is decimal GB, matching Oracle's console

// Cache-Control policy for bucket PUTs. The bucket serves assets DIRECTLY to
// browsers (no CDN in front) and Oracle sets no cache header by default, so every
// repeat view/replay re-hits Oracle and burns the 50k-req/month budget. Setting a
// long cache lets browsers serve repeats from disk (0 Oracle requests) and makes
// the site faster. BUT index.html / game.js get re-uploaded by the frame-buster
// fix scripts, so they can't be immutable-forever or a fix would never propagate:
//   .html        -> 1h   (fixes propagate fast; tiny files)
//   .js/.mjs     -> 1d   (buster fixes still propagate; ~95% of repeats cached)
//   everything else (img/audio/wasm/swf/data/rom/font) -> 1y immutable (never changes)
export function cacheControlFor(objectPath) {
	const ext = (objectPath.match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
	if (ext === '.html') return 'public, max-age=3600';
	if (ext === '.js' || ext === '.mjs') return 'public, max-age=86400';
	return 'public, max-age=31536000, immutable';
}

// Query the LIVE bucket size+count. Throws on any failure so callers fail closed.
export function liveBucket() {
	const out = execFileSync(
		'oci',
		['os', 'bucket', 'get', '--bucket-name', BUCKET, '--namespace', NAMESPACE,
			'--fields', 'approximateSize', '--fields', 'approximateCount'],
		{ encoding: 'utf8', timeout: 60000, env: { ...process.env, OCI_CLI_SUPPRESS_FILE_PERMISSIONS_WARNING: 'True' } }
	);
	const d = JSON.parse(out).data;
	const bytes = d['approximate-size'];
	const count = d['approximate-count'];
	if (typeof bytes !== 'number') throw new Error('bucket size missing from OCI response');
	return { bytes, count };
}

// Pure decision: given current + added bytes, are we under the ceiling?
export function checkRoom(currentBytes, addBytes = 0, ceilingGb = DEFAULT_CEILING_GB) {
	const currentGB = currentBytes / GB;
	const projectedGB = (currentBytes + addBytes) / GB;
	return {
		currentGB,
		projectedGB,
		ceilingGb,
		freeTierGB: FREE_TIER_GB,
		ok: projectedGB <= ceilingGb,
		headroomGB: ceilingGb - projectedGB
	};
}

function fmtReport(r, live, addBytes, addFiles) {
	const lines = [
		`FREE-TIER CHECK (Oracle Always Free: ${FREE_TIER_GB} GB storage, ${MONTHLY_REQUEST_BUDGET.toLocaleString()} req/mo):`,
		`  bucket now:   ${r.currentGB.toFixed(2)} GB, ${(live.count ?? 0).toLocaleString()} objects`
	];
	if (addBytes > 0 || addFiles > 0) {
		lines.push(`  this write:   +${(addBytes / GB).toFixed(2)} GB, ${addFiles.toLocaleString()} files (= ${addFiles.toLocaleString()} PUT requests, one-time)`);
	}
	lines.push(`  projected:    ${r.projectedGB.toFixed(2)} GB / ${FREE_TIER_GB} GB  (ceiling ${r.ceilingGb} GB)`);
	if (addFiles > 0) {
		lines.push(`  request note: one-time PUTs are ${((addFiles / MONTHLY_REQUEST_BUDGET) * 100).toFixed(0)}% of the monthly request budget.`);
	}
	return lines.join('\n');
}

// Fail-closed gate every writer calls before uploading. Prints a standard report,
// then throws (or exits 1 when `exit:true`) if the write would breach the ceiling
// or if the live size can't be read. Pass allowUnsafe to bypass (explicit --force).
export function enforceRoom(addBytes = 0, opts = {}) {
	const { addFiles = 0, ceilingGb = DEFAULT_CEILING_GB, label = 'write', allowUnsafe = false, exit = true } = opts;
	let live;
	try {
		live = liveBucket();
	} catch (e) {
		const msg = `✗ FREE-TIER GUARD [${label}]: cannot read live bucket size via OCI CLI (${String(e.message || e).slice(0, 80)}).\n` +
			`  Refusing to write without verifying we stay under the ${FREE_TIER_GB} GB free tier. Fix OCI auth or pass the unsafe override.`;
		if (allowUnsafe) { console.error(msg + '\n  (--force-unsafe: proceeding anyway)'); return { ...checkRoom(0, addBytes, ceilingGb), live: { bytes: 0, count: 0 }, unchecked: true }; }
		console.error('\n' + msg);
		if (exit) process.exit(1);
		throw new Error(msg);
	}
	const r = checkRoom(live.bytes, addBytes, ceilingGb);
	console.log('\n' + fmtReport(r, live, addBytes, addFiles));
	if (!r.ok) {
		const msg = `✗ FREE-TIER GUARD [${label}]: projected ${r.projectedGB.toFixed(2)} GB would exceed the ${ceilingGb} GB safety ceiling ` +
			`(${FREE_TIER_GB} GB free-tier cap). Aborting. Shrink the batch or raise the ceiling deliberately.`;
		if (allowUnsafe) { console.error(msg + '\n  (--force-unsafe: proceeding anyway)'); return { ...r, live, forced: true }; }
		console.error('\n' + msg);
		if (exit) process.exit(1);
		throw new Error(msg);
	}
	console.log(`  ✓ within free tier — ${r.headroomGB.toFixed(2)} GB headroom under the ${ceilingGb} GB ceiling.\n`);
	return { ...r, live };
}
