/**
 * Game health checks — "does this AI game actually work?"
 *
 * Two layers:
 *  1. staticValidate() — cheap, dependency-free structural scan for the exact ways
 *     DeepSeek corrupts a single-file HTML game (markdown fences, merged tags, a
 *     <script> nested inside <canvas>, a truncated document). Runs on every publish.
 *  2. renderCheck() — the real test: render the game in headless Chromium, watch for
 *     uncaught JS errors, nudge past the start screen, and confirm a <canvas> actually
 *     drew something (not a black screen). Also returns a viewport screenshot we use
 *     as the gallery cover — so "produces a real screenshot" == "works", exactly the
 *     signal the gallery/feed already rely on.
 *
 * renderCheck needs a Chromium binary on the host (playwright-core ships no browser).
 * It degrades gracefully: if no browser is available it returns { available:false } and
 * callers fall back to the static verdict rather than crashing.
 */
// NOTE: playwright-core is imported at RUNTIME via a dynamic import with a non-literal
// specifier (see getBrowser) so the bundler never tries to bundle it (it drags in native
// modules like fsevents). Only the TYPES are imported statically — type imports are
// erased at build time and produce no runtime code / bundling.
import type { Browser } from 'playwright-core';

export interface StaticResult {
    ok: boolean;
    issues: string[];
}

/** Structural corruption scan. ok=false means the file is definitely broken. */
export function staticValidate(html: string): StaticResult {
    const issues: string[] = [];
    const s = String(html || '');
    const lower = s.toLowerCase();

    if (!s.trim()) issues.push('empty');
    if (!lower.includes('<!doctype html')) issues.push('no-doctype');
    if (!lower.includes('</html>')) issues.push('no-html-close');
    // A stray markdown fence anywhere breaks the served HTML (black screen).
    if (s.includes('```')) issues.push('markdown-fence');
    // Merged tag: a tag name fused to its attribute with no space, e.g. "<canvasid=".
    // A well-formed tag is always "<canvas>" or "<canvas id=" (char after the name is
    // ">" or whitespace), so a letter immediately after the name is corruption.
    if (/<canvas[a-z]/i.test(s) || /<script[a-z]/i.test(s) || /<body[a-z]/i.test(s)) {
        issues.push('merged-tag');
    }
    // <script> nested inside <canvas> never executes (canvas children are fallback).
    const co = lower.indexOf('<canvas');
    if (co >= 0) {
        const cc = lower.indexOf('</canvas>', co);
        if (cc > co && lower.slice(co, cc).includes('<script')) issues.push('script-in-canvas');
    }

    return { ok: issues.length === 0, issues };
}

export interface RenderResult {
    available: boolean;     // was a headless browser usable at all
    ok: boolean;            // renders, non-blank canvas, no fatal error
    hasCanvas: boolean;
    blank: boolean;
    errors: string[];       // uncaught page errors / console errors
    coverPng?: Buffer;      // viewport screenshot (only when ok) — used as the gallery cover
    reason?: string;
}

let _browser: Browser | null = null;

/** Lazily launch (and reuse) one headless Chromium. Returns null if unavailable. */
async function getBrowser(): Promise<Browser | null> {
    if (_browser && _browser.isConnected()) return _browser;
    try {
        // Non-literal specifier keeps the bundler from statically resolving (and bundling)
        // playwright-core; it's loaded from node_modules on the server at runtime.
        const pkg = 'playwright' + '-core';
        const { chromium } = await import(/* @vite-ignore */ pkg);
        _browser = await chromium.launch({
            headless: true,
            // VPS-friendly flags: no sandbox (runs as a service user), small shm.
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
        });
        return _browser;
    } catch (err) {
        _browser = null;
        return null;
    }
}

/** Free the shared browser (call at the end of a sweep so a long-lived process reclaims it). */
export async function closeBrowser(): Promise<void> {
    try {
        await _browser?.close();
    } catch {
        /* already gone */
    }
    _browser = null;
}

/** 32x18 downsample blank-detect, identical in spirit to the client's captureCover guard. */
const BLANK_PROBE = `(() => {
  const cs = Array.from(document.querySelectorAll('canvas'));
  if (!cs.length) return { hasCanvas: false, blank: true };
  const c = cs.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  if (!c || !c.width || !c.height) return { hasCanvas: true, blank: true };
  try {
    const s = document.createElement('canvas'); s.width = 32; s.height = 18;
    const ctx = s.getContext('2d'); ctx.drawImage(c, 0, 0, 32, 18);
    const d = ctx.getImageData(0, 0, 32, 18).data;
    let min = 255, max = 0, sumA = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum < min) min = lum; if (lum > max) max = lum; sumA += d[i + 3];
    }
    return { hasCanvas: true, blank: (max - min < 12) || sumA === 0 };
  } catch (e) { return { hasCanvas: true, blank: false }; }
})()`;

/**
 * Render a game and decide whether it works. Nudges past a start screen (Space + a
 * center click) so games that open on "press any key" still prove they draw a frame.
 */
export async function renderCheck(html: string): Promise<RenderResult> {
    const browser = await getBrowser();
    if (!browser) {
        return { available: false, ok: false, hasCanvas: false, blank: true, errors: [], reason: 'no-browser' };
    }

    const errors: string[] = [];
    const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e?.message || e)));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
    });

    try {
        await page.setContent(html, { waitUntil: 'load', timeout: 8_000 });
        // Let the start screen / first frame draw.
        await page.waitForTimeout(1_800);
        // Nudge past a "tap / press any key to start" screen so motion begins.
        await page.keyboard.press('Space').catch(() => {});
        await page.mouse.click(450, 300).catch(() => {});
        await page.waitForTimeout(1_400);

        const probe = (await page.evaluate(BLANK_PROBE)) as { hasCanvas: boolean; blank: boolean };
        // No canvas at all is broken per our single-canvas game format; a fatal JS
        // error or a blank canvas is broken too.
        const fatal = errors.length > 0;
        const ok = probe.hasCanvas && !probe.blank && !fatal;

        let coverPng: Buffer | undefined;
        if (ok) {
            try {
                coverPng = await page.screenshot({ type: 'png' });
            } catch {
                /* cover is best-effort */
            }
        }

        return {
            available: true,
            ok,
            hasCanvas: probe.hasCanvas,
            blank: probe.blank,
            errors: errors.slice(0, 5),
            coverPng,
            reason: ok ? 'ok' : !probe.hasCanvas ? 'no-canvas' : probe.blank ? 'blank' : 'js-error'
        };
    } catch (err: any) {
        return {
            available: true,
            ok: false,
            hasCanvas: false,
            blank: true,
            errors: [String(err?.message || err)],
            reason: 'render-threw'
        };
    } finally {
        await ctx.close().catch(() => {});
    }
}
