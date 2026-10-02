import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import {
    getRegistry,
    updateGameInRegistry,
    uploadToOCI,
    type UserGame
} from '$lib/server/oci';
import { generateGameCode } from '$lib/server/deepseek';
import { staticValidate, renderCheck, closeBrowser } from '$lib/server/gamehealth';

// A game can be regenerated at most twice total (shared with the "report broken" flow)
// so a persistently-broken game can't burn unbounded DeepSeek calls across sweeps.
const MAX_REGENS = 2;
// Auto-fix attempts that produced a STILL-broken game are bounded separately, so the
// sweep stops spending on a game DeepSeek can't repair (it's hidden instead).
const MAX_FIX_ATTEMPTS = 2;

type Outcome =
    | 'ok'                // already works, nothing to do
    | 'cover-backfilled'  // works but had no screenshot — captured one (now feed-eligible)
    | 'fixed'             // was broken, regenerated into a VERIFIED working game
    | 'fix-failed'        // regenerated but the fix still doesn't render — original kept, attempt counted
    | 'broken-capped'     // broken and out of fix attempts — hidden from the gallery/feed
    | 'fix-error'         // DeepSeek threw while fixing (no attempt consumed)
    | 'skip';

function fixPromptFor(game: UserGame, issues: string[]): string {
    return (
        `This community game was flagged BROKEN by an automated health check ` +
        (issues.length ? `(detected: ${issues.join(', ')}). ` : '. ') +
        `It may show a black screen, throw errors, ignore input, have a <script> nested ` +
        `inside <canvas>, merged tags, markdown fences, or undefined variables. Analyze the ` +
        `source and output a COMPLETELY FIXED, fully playable version that keeps the original ` +
        `concept "${game.title}". Fix every bug.`
    );
}

async function fetchSource(codeUrl: string): Promise<string> {
    const res = await fetch(codeUrl.split('?')[0], {
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) throw new Error(`source fetch ${res.status}`);
    return res.text();
}

async function uploadCover(id: string, png: Buffer): Promise<string> {
    // Pass a Blob (not a raw Buffer) so uploadToOCI's size check works. Wrap in a fresh
    // Uint8Array so the type is a plain ArrayBuffer-backed view (BlobPart-compatible).
    const blob = new Blob([new Uint8Array(png)], { type: 'image/png' });
    return uploadToOCI(`user-games/${id}.png`, blob, 'image/png');
}

/**
 * Automated health sweep: render every AI game headlessly, fix the genuinely-broken ones
 * (DeepSeek, within the regen cap) and backfill covers for games that work but never got
 * a screenshot. NON-DESTRUCTIVE for working games — a game that renders is only ever
 * given a cover, never regenerated. Password-gated (ADMIN_PASSWORD); callable from the
 * admin dashboard or a nightly cron.
 *
 * Body: { password, limit?=20, recheckOk?=false }
 *  - limit: max games to process this run (bounds time + DeepSeek COGS; cron repeats).
 *  - recheckOk: also re-render games already marked health:'ok' (default skips them).
 */
export const POST: RequestHandler = async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as any;
    const expected = env.ADMIN_PASSWORD;
    if (!expected) return json({ error: 'Admin is not configured on this server.' }, { status: 503 });
    if (!body?.password || body.password !== expected) {
        return json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const limit = Math.max(1, Math.min(100, Number(body.limit) || 20));
    const recheckOk = body.recheckOk === true;

    const registry = await getRegistry();

    // Candidates: AI games (never regenerate user uploads — they may be non-canvas) that
    // still have something to do. We EXCLUDE terminal games so the sweep converges to
    // remaining:0 instead of re-processing the same stuck games forever:
    //   - health 'ok' (already working), and
    //   - health 'broken' with no fix budget left (already hidden; nothing more to try).
    // Games with no cover come first (most impactful: a cover makes them feed-eligible).
    const isTerminal = (g: UserGame) =>
        g.health === 'ok' ||
        (g.health === 'broken' &&
            ((g.regenCount || 0) >= MAX_REGENS || (g.healthFixAttempts || 0) >= MAX_FIX_ATTEMPTS));
    const candidates = registry
        .filter((g) => g.source !== 'upload')
        .filter((g) => (recheckOk ? true : !isTerminal(g)))
        .sort((a, b) => {
            const ac = a.coverUrl ? 1 : 0;
            const bc = b.coverUrl ? 1 : 0;
            if (ac !== bc) return ac - bc; // no-cover first
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // oldest first
        });

    const batch = candidates.slice(0, limit);
    const results: Array<{ id: string; title: string; outcome: Outcome; reason?: string }> = [];
    let browserAvailable = true;

    try {
        for (const game of batch) {
            const now = new Date().toISOString();
            let html = '';
            try {
                html = await fetchSource(game.codeUrl);
            } catch {
                // Can't read the source (a game whose code 404s is effectively broken, but
                // don't regenerate blindly). Count the attempt so a permanently-unreadable
                // game eventually goes terminal (hidden) instead of being retried forever.
                const attempts = (game.healthFixAttempts || 0) + 1;
                const terminal = attempts >= MAX_FIX_ATTEMPTS;
                await updateGameInRegistry(game.id, {
                    health: terminal ? 'broken' : 'unknown',
                    lastHealthAt: now,
                    healthFixAttempts: attempts
                });
                results.push({
                    id: game.id,
                    title: game.title,
                    outcome: terminal ? 'broken-capped' : 'skip',
                    reason: 'source-unreadable'
                });
                continue;
            }

            const stat = staticValidate(html);
            const render = await renderCheck(html);
            if (!render.available) browserAvailable = false;
            // When no browser is present, fall back to the static structural verdict.
            const works = render.available ? render.ok : stat.ok;

            if (works) {
                const patch: Partial<UserGame> = { health: 'ok', lastHealthAt: now };
                let outcome: Outcome = 'ok';
                if (!game.coverUrl && render.coverPng) {
                    try {
                        patch.coverUrl = await uploadCover(game.id, render.coverPng);
                        outcome = 'cover-backfilled';
                    } catch {
                        /* cover is best-effort */
                    }
                }
                await updateGameInRegistry(game.id, patch);
                results.push({ id: game.id, title: game.title, outcome });
                continue;
            }

            // Broken.
            const used = game.regenCount || 0;
            const attempts = game.healthFixAttempts || 0;
            const issues = render.available ? [render.reason || 'broken', ...render.errors] : stat.issues;
            // Out of budget (either the shared regen cap or our auto-fix-attempt cap) →
            // leave it marked broken so the gallery/feed hide it, and stop spending.
            if (used >= MAX_REGENS || attempts >= MAX_FIX_ATTEMPTS) {
                await updateGameInRegistry(game.id, { health: 'broken', lastHealthAt: now });
                results.push({ id: game.id, title: game.title, outcome: 'broken-capped', reason: render.reason });
                continue;
            }

            let fixed: string;
            try {
                fixed = await generateGameCode(fixPromptFor(game, issues), game.description || undefined, html);
            } catch (err: any) {
                // Generation failed → no attempt consumed; mark broken for a later retry.
                await updateGameInRegistry(game.id, { health: 'broken', lastHealthAt: now });
                results.push({ id: game.id, title: game.title, outcome: 'fix-error', reason: err?.message });
                continue;
            }

            const fixRender = await renderCheck(fixed);
            const fixWorks = fixRender.available ? fixRender.ok : staticValidate(fixed).ok;

            if (!fixWorks) {
                // Don't replace a game with a fix that's still broken — keep the original,
                // just count the attempt so we stop trying after MAX_FIX_ATTEMPTS.
                await updateGameInRegistry(game.id, {
                    health: 'broken',
                    lastHealthAt: now,
                    healthFixAttempts: attempts + 1
                });
                results.push({ id: game.id, title: game.title, outcome: 'fix-failed', reason: fixRender.reason });
                continue;
            }

            // Verified working fix → commit it (overwrite source, bump the regen cap, cover).
            const nextCount = used + 1;
            const baseUrl = await uploadToOCI(`user-games/${game.id}.html`, fixed, 'text/html');
            const patch: Partial<UserGame> = {
                codeUrl: `${baseUrl}?v=${nextCount}`,
                regenCount: nextCount,
                sizeBytes: new TextEncoder().encode(fixed).length,
                health: 'ok',
                lastHealthAt: now
            };
            if (fixRender.coverPng) {
                try {
                    patch.coverUrl = await uploadCover(game.id, fixRender.coverPng);
                } catch {
                    /* best-effort */
                }
            }
            await updateGameInRegistry(game.id, patch);
            results.push({ id: game.id, title: game.title, outcome: 'fixed' });
        }
    } finally {
        // Reclaim the headless browser between runs so a long-lived node process
        // doesn't hold Chromium memory idle until the next sweep.
        await closeBrowser();
    }

    const tally = results.reduce<Record<string, number>>((acc, r) => {
        acc[r.outcome] = (acc[r.outcome] || 0) + 1;
        return acc;
    }, {});

    return json({
        success: true,
        browserAvailable,
        processed: results.length,
        remaining: Math.max(0, candidates.length - batch.length),
        tally,
        results
    });
};
