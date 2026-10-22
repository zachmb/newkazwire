// Unit tests for the game-health verdict logic. Run: npx tsx scripts/gamehealth.test.mts
//
// Covers the two dependency-free layers that decide "does this AI game work?":
//  - staticValidate(): the exact structural corruptions DeepSeek emits.
//  - the pure frame-signal helpers (signatureIsBlank / motionScore / hasMotion) that
//    renderCheck feeds canvas snapshots into to tell a LIVE game from a frozen one.
// The headless-Chromium part of renderCheck can't run here (no browser), but its verdict
// is computed entirely from these pure functions, so this locks the real decision logic.
import {
	staticValidate,
	signatureIsBlank,
	motionScore,
	hasMotion
} from '../src/lib/server/gamehealth.ts';

let pass = 0,
	fail = 0;
const bad: string[] = [];
function expect(name: string, cond: boolean) {
	if (cond) pass++;
	else {
		fail++;
		bad.push(name);
	}
}

// ── staticValidate ────────────────────────────────────────────────────────────
const GOOD = '<!DOCTYPE html><html><head></head><body><canvas id="c"></canvas><script>1</script></body></html>';
expect('GOOD passes static', staticValidate(GOOD).ok);
expect('empty fails', !staticValidate('').ok && staticValidate('').issues.includes('empty'));
expect('no-doctype fails', staticValidate('<html><canvas></canvas></html>').issues.includes('no-doctype'));
expect('no-html-close fails', staticValidate('<!doctype html><html><canvas></canvas>').issues.includes('no-html-close'));
expect('markdown-fence fails', staticValidate('```html\n' + GOOD + '\n```').issues.includes('markdown-fence'));
expect(
	'merged-tag <canvasid fails',
	staticValidate('<!doctype html><html><canvasid="c"></canvas></html>').issues.includes('merged-tag')
);
expect(
	'script-in-canvas fails',
	staticValidate('<!doctype html><html><canvas><script>1</script></canvas></html>').issues.includes(
		'script-in-canvas'
	)
);
// A legit <canvas id=...> (space before attr) must NOT trip merged-tag.
expect('canvas with space attr ok', !staticValidate(GOOD).issues.includes('merged-tag'));

// ── signatureIsBlank: uniform/empty = blank, varied = not ───────────────────────
const flatBlack = new Array(1296).fill(0);
const flatGray = new Array(1296).fill(128);
const varied = Array.from({ length: 1296 }, (_, i) => (i * 37) % 256);
expect('flat black is blank', signatureIsBlank(flatBlack));
expect('flat gray is blank', signatureIsBlank(flatGray));
expect('empty sig is blank', signatureIsBlank([]) && signatureIsBlank(null) && signatureIsBlank(undefined));
expect('varied sig is NOT blank', !signatureIsBlank(varied));
// A near-uniform frame (range < 12) counts as blank; a clearly different one does not.
expect('range 10 is blank', signatureIsBlank([100, 100, 105, 110]));
expect('range 50 is NOT blank', !signatureIsBlank([100, 100, 105, 150]));

// ── motionScore: identical frames = 0, changed cells counted ────────────────────
const base = new Array(100).fill(50);
const same = base.slice();
const movedALittle = base.slice();
movedALittle[0] = 200; // one cell moved a lot
movedALittle[1] = 55; // one cell moved only 5 (below the >10 threshold → ignored)
const movedALot = base.map((v, i) => (i < 20 ? 200 : v)); // 20 cells moved
expect('identical frames score 0', motionScore(base, same) === 0);
expect('one big-change cell counts as 1', motionScore(base, movedALittle) === 1);
expect('tiny changes (<=10) ignored', motionScore(base, [50, 58, 50]) === 0);
expect('20 changed cells score 20', motionScore(base, movedALot) === 20);
expect('mismatched lengths score 0', motionScore([1, 2, 3], [1, 2]) === 0);

// ── hasMotion: THE core live-vs-frozen verdict ──────────────────────────────────
// Frozen game: every sampled frame identical → NO motion → would be marked broken.
const frozen = [base.slice(), base.slice(), base.slice(), base.slice()];
expect('frozen (all identical frames) has NO motion', !hasMotion(frozen));
// Animated/responsive game: a later frame differs by >= 3 cells → motion.
const animated = [base.slice(), base.slice(), movedALot, base.slice()];
expect('animated (a frame changed a lot) HAS motion', hasMotion(animated));
// Just below threshold: only 2 cells ever change → not enough to call it live.
const twoCells = base.slice();
twoCells[0] = 200;
twoCells[1] = 200;
expect('only 2 changed cells is NOT motion (min 3)', !hasMotion([base.slice(), twoCells]));
// Exactly at threshold: 3 changed cells → motion.
const threeCells = base.slice();
threeCells[0] = 200;
threeCells[1] = 200;
threeCells[2] = 200;
expect('exactly 3 changed cells IS motion', hasMotion([base.slice(), threeCells]));
// Degenerate input: a single frame (or none) can't show motion.
expect('single frame has no motion', !hasMotion([base.slice()]));
expect('empty sample set has no motion', !hasMotion([]));
expect('frames that are all blank/empty have no motion', !hasMotion([[], [], []]));

// ── report ──────────────────────────────────────────────────────────────────────
console.log(`\ngamehealth: ${pass} passed, ${fail} failed`);
if (fail) {
	console.error('FAILED:\n  - ' + bad.join('\n  - '));
	process.exit(1);
}
console.log('All gamehealth tests passed ✓');
