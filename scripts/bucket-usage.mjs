// Report Oracle `frogbase` storage usage against the Always Free cap.
// Run anytime, or on a cron, to catch growth before it reaches 20 GB.
//
//   node scripts/bucket-usage.mjs                 # print report
//   node scripts/bucket-usage.mjs --warn-gb 16    # exit 1 if at/over 16 GB
//   node scripts/bucket-usage.mjs --json          # machine-readable
//
// Exit codes:  0 = under warn threshold   1 = at/over warn   2 = couldn't read
import { liveBucket, FREE_TIER_GB, DEFAULT_CEILING_GB, MONTHLY_REQUEST_BUDGET } from './bucket-guard.mjs';

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const WARN_GB = parseFloat(argOf('--warn-gb', String(DEFAULT_CEILING_GB))); // default: warn at the upload ceiling
const JSON_OUT = args.includes('--json');
const GB = 1e9;

let live;
try {
	live = liveBucket();
} catch (e) {
	if (JSON_OUT) console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
	else console.error(`✗ could not read frogbase size via OCI CLI: ${String(e.message || e).slice(0, 120)}`);
	process.exit(2);
}

const gb = live.bytes / GB;
const pct = (gb / FREE_TIER_GB) * 100;
const over = gb >= WARN_GB;

if (JSON_OUT) {
	console.log(JSON.stringify({
		ok: true, bytes: live.bytes, gb: +gb.toFixed(3), objects: live.count,
		freeTierGB: FREE_TIER_GB, ceilingGB: DEFAULT_CEILING_GB, warnGB: WARN_GB,
		pctOfCap: +pct.toFixed(1), over
	}));
} else {
	const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '·');
	console.log(`frogbase: ${gb.toFixed(2)} GB / ${FREE_TIER_GB} GB  [${bar}] ${pct.toFixed(1)}% of free tier`);
	console.log(`          ${live.count.toLocaleString()} objects · upload ceiling ${DEFAULT_CEILING_GB} GB · ${MONTHLY_REQUEST_BUDGET.toLocaleString()} req/mo`);
	if (over) console.log(`⚠️  at/over the ${WARN_GB} GB warning threshold — stop uploading and prune before it reaches ${FREE_TIER_GB} GB.`);
	else console.log(`✓ ${(WARN_GB - gb).toFixed(2)} GB of headroom under the ${WARN_GB} GB warning threshold.`);
}
process.exit(over ? 1 : 0);
