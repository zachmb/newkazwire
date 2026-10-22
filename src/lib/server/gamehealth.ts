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
    ok: boolean;            // renders, non-blank, LIVE (animates/responds), no fatal error
    hasCanvas: boolean;
    blank: boolean;
    motion?: boolean;       // the canvas actually changed over the test window (not frozen)
    errors: string[];       // uncaught page errors / console errors
    raf?: number | null;          // requestAnimationFrame calls observed (liveness diagnostic)
    keyListeners?: number | null; // keyboard listeners the game registered (input wiring)
    pointerListeners?: number | null; // pointer/mouse/touch listeners registered
    coverPng?: Buffer;      // viewport screenshot (only when non-blank) — used as the gallery cover
    reason?: string;
}

// ── Pure signal helpers (exported so the test harness can exercise the verdict
// logic without a browser). A "signature" is a row-major luminance array of a
// SIG_W×SIG_H downsample of the game's largest canvas. ───────────────────────
const SIG_W = 48;
const SIG_H = 27;

/** A frame is blank if its luminance is near-uniform (a flat color / black screen). */
export function signatureIsBlank(sig: number[] | null | undefined): boolean {
    if (!sig || sig.length === 0) return true;
    let min = 255,
        max = 0;
    for (const v of sig) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    return max - min < 12;
}

/** How many downsample cells changed meaningfully between two frames. */
export function motionScore(a: number[] | null | undefined, b: number[] | null | undefined): number {
    if (!a || !b || !a.length || a.length !== b.length) return 0;
    let changed = 0;
    for (let i = 0; i < a.length; i++) {
        if (Math.abs(a[i] - b[i]) > 10) changed++;
    }
    return changed;
}

/**
 * True if ANY pair of sampled frames differs by at least `minChangedCells` cells —
 * i.e. the game animated on its own OR visibly responded to the injected input.
 * A frozen static image (broken loop / dead input) produces 0 and fails this.
 */
export function hasMotion(sigs: Array<number[] | null | undefined>, minChangedCells = 3): boolean {
    const valid = sigs.filter((s): s is number[] => Array.isArray(s) && s.length > 0);
    for (let i = 0; i < valid.length; i++) {
        for (let j = i + 1; j < valid.length; j++) {
            if (motionScore(valid[i], valid[j]) >= minChangedCells) return true;
        }
    }
    return false;
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

/**
 * In-page probe: downsample the largest canvas to SIG_W×SIG_H and return a row-major
 * luminance signature (plus whether a canvas exists at all). The small canvas is
 * cleared to black first so a fully-transparent game canvas reads as uniform (blank),
 * folding the old alpha==0 case into the luminance-range check. Pure data out — the
 * blank/motion verdict is computed in Node from the signatures so it's unit-testable.
 */
const SIG_PROBE = `(() => {
  const cs = Array.from(document.querySelectorAll('canvas'));
  if (!cs.length) return { hasCanvas: false, sig: [] };
  const c = cs.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  if (!c || !c.width || !c.height) return { hasCanvas: true, sig: [] };
  try {
    const W = ${SIG_W}, H = ${SIG_H};
    const s = document.createElement('canvas'); s.width = W; s.height = H;
    const g = s.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.drawImage(c, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const out = new Array(W * H);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) out[j] = (d[i] + d[i + 1] + d[i + 2]) / 3 | 0;
    return { hasCanvas: true, sig: out };
  } catch (e) { return { hasCanvas: true, sig: [] }; }
})()`;

// Installed BEFORE any game script runs (context.addInitScript) to observe liveness
// signals the pixel probe can't see: whether a rAF loop is actually running, whether
// input listeners got wired, and errors the page 'error'/rejection handlers catch.
function INSTRUMENT() {
    try {
        const w = window as any;
        w.__kz = { raf: 0, keyListeners: 0, pointerListeners: 0, errors: [] as string[] };
        const raf = w.requestAnimationFrame?.bind(w);
        if (raf) {
            w.requestAnimationFrame = function (cb: FrameRequestCallback) {
                w.__kz.raf++;
                return raf(cb);
            };
        }
        const add = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (type: string, ...rest: any[]) {
            try {
                if (/^key/.test(type)) w.__kz.keyListeners++;
                else if (/^(pointer|mouse|touch|click)/.test(type)) w.__kz.pointerListeners++;
            } catch (_) {
                /* ignore */
            }
            // @ts-ignore - forward through
            return add.call(this, type, ...rest);
        };
        w.addEventListener('error', (e: any) => {
            try {
                w.__kz.errors.push(String((e && (e.message || e.error)) || 'error'));
            } catch (_) {
                /* ignore */
            }
        });
        w.addEventListener('unhandledrejection', (e: any) => {
            try {
                w.__kz.errors.push('unhandledrejection: ' + String(e && e.reason));
            } catch (_) {
                /* ignore */
            }
        });
    } catch (_) {
        /* ignore */
    }
}

/**
 * Render a game and decide whether it actually WORKS — not just "drew one frame".
 *
 * The old check only asked "is a single frame non-blank?", which a static title
 * screen that ignores all input passes. This one proves the game is LIVE: it samples
 * the canvas over a ~3.5s window while injecting a realistic burst of input (Space /
 * Enter / center click to clear a start screen, then arrows + WASD + pointer moves +
 * clicks), and requires the canvas to actually CHANGE across that window — either it
 * animates on its own or it visibly responds to input. A frozen image, a dead game
 * loop, or unwired controls produce no motion and fail. Uncaught errors at ANY point
 * in the window (including those triggered by the injected input) also fail it.
 */
export async function renderCheck(html: string): Promise<RenderResult> {
    const browser = await getBrowser();
    if (!browser) {
        return { available: false, ok: false, hasCanvas: false, blank: true, errors: [], reason: 'no-browser' };
    }

    const errors: string[] = [];
    const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
    await ctx.addInitScript(INSTRUMENT).catch(() => {});
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e?.message || e)));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
    });

    const sample = async (): Promise<{ hasCanvas: boolean; sig: number[] }> =>
        (await page.evaluate(SIG_PROBE).catch(() => ({ hasCanvas: false, sig: [] }))) as {
            hasCanvas: boolean;
            sig: number[];
        };

    try {
        await page.setContent(html, { waitUntil: 'load', timeout: 8_000 });
        await page.waitForTimeout(900); // let the start screen / first frame draw

        const first = await sample();
        if (!first.hasCanvas) {
            return { available: true, ok: false, hasCanvas: false, blank: true, motion: false, errors: errors.slice(0, 5), reason: 'no-canvas' };
        }

        const sigs: number[][] = [first.sig];

        // Burst 1 — clear a "press any key / tap to start" screen so the real game begins.
        await page.keyboard.press('Space').catch(() => {});
        await page.keyboard.press('Enter').catch(() => {});
        await page.mouse.click(450, 300).catch(() => {});
        await page.waitForTimeout(500);
        sigs.push((await sample()).sig);

        // Burst 2 — exercise real gameplay input while sampling, so an input-driven game
        // (which only changes when you act) also demonstrates it responds.
        const keys = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'KeyW', 'KeyD', 'KeyA', 'KeyS'];
        const pts: Array<[number, number]> = [
            [300, 200],
            [600, 400],
            [450, 300],
            [700, 250]
        ];
        for (let k = 0; k < 5; k++) {
            await page.keyboard.press(keys[k % keys.length]).catch(() => {});
            const [x, y] = pts[k % pts.length];
            await page.mouse.move(x, y).catch(() => {});
            if (k % 2 === 0) await page.mouse.click(x, y).catch(() => {});
            await page.waitForTimeout(380);
            sigs.push((await sample()).sig);
        }

        // Fold in errors the in-page handlers caught (page 'error'/rejection events).
        const inst = (await page.evaluate('window.__kz || null').catch(() => null)) as {
            raf?: number;
            keyListeners?: number;
            pointerListeners?: number;
            errors?: string[];
        } | null;
        if (inst?.errors?.length) for (const e of inst.errors) errors.push(e);

        const hasCanvas = true;
        const blank = sigs.every((s) => signatureIsBlank(s));
        const motion = hasMotion(sigs);
        const fatal = errors.length > 0;
        const ok = hasCanvas && !blank && !fatal && motion;

        // Cover any non-blank frame (even a frozen one needs a tile if a later sweep keeps
        // it); callers only backfill/ship covers for games they mark 'ok'.
        let coverPng: Buffer | undefined;
        if (!blank) {
            try {
                coverPng = await page.screenshot({ type: 'png' });
            } catch {
                /* cover is best-effort */
            }
        }

        const reason = ok
            ? 'ok'
            : !hasCanvas
              ? 'no-canvas'
              : blank
                ? 'blank'
                : fatal
                  ? 'js-error'
                  : !motion
                    ? 'frozen'
                    : 'broken';

        return {
            available: true,
            ok,
            hasCanvas,
            blank,
            motion,
            errors: errors.slice(0, 5),
            raf: inst?.raf ?? null,
            keyListeners: inst?.keyListeners ?? null,
            pointerListeners: inst?.pointerListeners ?? null,
            coverPng,
            reason
        };
    } catch (err: any) {
        return {
            available: true,
            ok: false,
            hasCanvas: false,
            blank: true,
            motion: false,
            errors: [String(err?.message || err)],
            reason: 'render-threw'
        };
    } finally {
        await ctx.close().catch(() => {});
    }
}
