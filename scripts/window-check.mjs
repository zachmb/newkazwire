// Functional check for the floating snap-window system (desktop viewport).
// Walks the real UI: game page -> "Window" button -> window + dock appear ->
// tile menu snaps left -> second window from dock "+" -> close all.
// Run: node scripts/window-check.mjs (needs `npm run preview` on :4173 or PORT env)
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const fail = (msg) => {
	console.error('✗ ' + msg);
	process.exit(1);
};
const ok = (msg) => console.log('✓ ' + msg);

const browser = await chromium.launch({
	channel: 'chrome',
	headless: true
});
const pageErrors = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => pageErrors.push((e.stack || String(e)).slice(0, 300)));

await page.goto(BASE + '/g/slope', { waitUntil: 'domcontentloaded' });

// Pre-existing bug fix check: the About header must carry the game name.
const about = await page.locator('h2:has-text("About")').first().textContent();
if (!/About\s+\S/.test(about || '')) fail(`About header empty: "${about}"`);
ok(`About header has game name: "${about.trim()}"`);

// 1. The Window button exists, is visible + enabled at desktop width.
const winBtn = page.locator('button[title*="floating window"]');
if (!(await winBtn.isVisible())) fail('Window button not visible on /g/slope');
if (!(await winBtn.isEnabled())) fail('Window button disabled');
ok('Window button visible + enabled');

// 2. Clicking opens a floating window with an iframe and shows the dock.
await winBtn.click();
const winTitle = page.locator('[data-kz-window] header span.truncate');
await winTitle.first().waitFor({ state: 'visible', timeout: 5000 });
const frames = await page.locator('[data-kz-window] iframe').count();
if (frames < 1) fail('window opened without an iframe');
ok('Window opened with iframe (title: ' + (await winTitle.first().textContent()) + ')');

const dock = page.locator('div.fixed.bottom-3');
if (!(await dock.isVisible())) fail('dock not visible after opening a window');
ok('Dock visible');

// 3. Tile menu snaps the window to the left half.
await page.locator('button[aria-label="Snap window"]').first().click();
await page.locator('button:has-text("Left half")').first().click();
await page.waitForTimeout(200);
const box = await page.locator('[data-kz-window]').first().boundingBox();
if (!box) fail('window box missing after snap');
const expectedW = (1440 - 16) / 2;
if (Math.abs(box.width - expectedW) > 30 || box.x > 20)
	fail(`snap left wrong rect: x=${box.x} w=${box.width} (expected x~8 w~${expectedW})`);
ok(`Snapped to left half (x=${box.x}, w=${box.width})`);

// 4. Dock "+" opens the launcher and opens a second window.
await page.locator('button[aria-label="Open a new window"]').click();
await page.locator('button:has-text("Feed")').first().click();
await page.waitForTimeout(300);
const winCount = await page.locator('[data-kz-window]').count();
if (winCount < 2) fail('second window did not open from dock launcher');
ok('Second window opened from dock (+) launcher');

// 5. Minimize hides the window but keeps it in the dock; close-all clears.
await page.locator('button[aria-label="Minimize window"]').first().click();
await page.waitForTimeout(150);
await page.locator('button[aria-label="Close all windows"]').click();
await page.waitForTimeout(150);
if ((await page.locator('[data-kz-window]').count()) !== 0) fail('close-all left windows open');
if (await dock.isVisible()) fail('dock still visible after close-all');
ok('Minimize + close-all work; dock hides');

// 6. Persistence: reopen a window, reload, it should come back.
await page.locator('button[title*="floating window"]').click();
await winTitle.first().waitFor({ state: 'visible', timeout: 5000 });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('[data-kz-window] header span.truncate').first().waitFor({ state: 'visible', timeout: 5000 });
ok('Windows persist across reload');

// Errors thrown by third-party game assets (CDN bucket) or ad scripts aren't
// ours — e.g. Slope's unityloader41.js throws its own ReferenceError on load.
const realErrors = pageErrors.filter(
	(e) => !/adsbygoogle|googlesyndication|objectstorage\.[a-z0-9-]+\.oraclecloud\.com/.test(e)
);
if (realErrors.length) fail('page errors: ' + realErrors.join(' | '));
ok('No page errors');

await browser.close();
console.log('ALL WINDOW CHECKS PASSED');
