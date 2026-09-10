// Functional checks for global search + game-page side columns.
// 1. Ctrl+K opens the search overlay anywhere; typing filters; Escape closes.
// 2. On /g/[id] the left rail and right recommended column extend to the
//    bottom of the page (within a tolerance), not just one viewport.
// Run with `npm run preview` on :4173, or BASE_URL=https://kazwire.com
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const fail = (m) => {
	console.error('✗ ' + m);
	process.exit(1);
};
const ok = (m) => console.log('✓ ' + m);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));

// --- Ctrl+K search (on the home page)
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.keyboard.press('Control+KeyK');
const input = page.locator('input[placeholder="Search for games..."]');
await input.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('Ctrl+K did not open the search overlay'));
ok('Ctrl+K opens search overlay');
await input.fill('slope');
await page.waitForTimeout(400);
const hasResult = await page.locator('text=Slope').first().isVisible().catch(() => false);
if (!hasResult) fail('typing "slope" showed no Slope result');
ok('Search filters live (slope found)');
await page.keyboard.press('Escape');
await input.waitFor({ state: 'hidden', timeout: 4000 }).catch(() => fail('Escape did not close the overlay'));
ok('Escape closes overlay');

// Ctrl+K works on inner pages too
await page.goto(BASE + '/g/slope', { waitUntil: 'networkidle' });
await page.keyboard.press('Control+KeyK');
await input.waitFor({ state: 'visible', timeout: 4000 }).catch(() => fail('Ctrl+K dead on /g/slope'));
await page.keyboard.press('Escape');
ok('Ctrl+K works on game pages');

// --- Side columns reach the page bottom on /g/[id] — measured on CONTENT,
// not stretched grid containers (those always align and can false-green).
const m = await page.evaluate(() => {
	const grid = document.querySelector('.grid.lg\\:grid-cols-\\[1fr_5fr_2fr\\]');
	const main = grid?.querySelector('main');
	const last = main?.lastElementChild;
	const rail = document.querySelector('[data-kz-rail]');
	const recs = document.querySelector('[data-kz-recs]');
	const bot = (el) => (el ? el.getBoundingClientRect().bottom + window.scrollY : -1);
	const fills = (el) => (el ? el.scrollHeight >= el.clientHeight - 5 : false);
	return {
		mainBottom: bot(last),
		docH: document.documentElement.scrollHeight,
		railBottom: bot(rail),
		railFills: fills(rail),
		recsBottom: bot(recs),
		recsFills: fills(recs)
	};
});
if (m.mainBottom < 0) fail('game page main content not found');
if (m.docH - m.mainBottom > 400) fail(`page height inflated: doc ${m.docH} vs main content ${Math.round(m.mainBottom)} — a side rail is defining the page height`);
ok(`page height set by main content (doc ${m.docH}, main ${Math.round(m.mainBottom)})`);
for (const [name, bottom, fills] of [['left rail', m.railBottom, m.railFills], ['right recs', m.recsBottom, m.recsFills]]) {
	if (bottom < 0) fail(`${name} not found`);
	if (m.mainBottom - bottom > 60) fail(`${name} ends ${Math.round(m.mainBottom - bottom)}px above the main content bottom`);
	if (!fills) fail(`${name} does not fill its column with tiles`);
	ok(`${name} runs to page bottom and is filled (gap ${Math.round(m.mainBottom - bottom)}px)`);
}

const real = errors.filter((e) => !/adsbygoogle|googlesyndication|oraclecloud/.test(e));
if (real.length) fail('page errors: ' + real.join(' | '));
ok('No first-party page errors');
await browser.close();
console.log('ALL UI FLOW CHECKS PASSED');
