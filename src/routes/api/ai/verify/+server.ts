import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateGameCode, buildFixPrompt } from '$lib/server/deepseek';
import { renderCheck, staticValidate } from '$lib/server/gamehealth';

/**
 * Server-authoritative pre-publish health gate.
 *
 * The generator client POSTs a freshly-made game here BEFORE publishing. We render it
 * in headless Chromium and run the rigorous renderCheck — the game must actually be
 * LIVE (animates and/or responds to injected input, throws no uncaught errors), not
 * merely "drew one non-blank frame" (which a dead title screen passes). If it's broken
 * we make ONE bounded DeepSeek repair and re-verify, returning the repaired source and
 * a real cover PNG. This is why published games actually work — the verdict is produced
 * by the same engine a player's browser runs, not a shallow client guess.
 *
 * Degrades gracefully: on a host with no browser it returns { available:false } and the
 * client falls back to its local cover probe rather than being blocked from publishing.
 *
 * Body: { code: string, title?: string, description?: string, fix?: boolean }
 * Returns: { available, ok, reason, code?, cover?, errors?, signals? }
 */

function coverDataUrl(buf?: Buffer): string | undefined {
    if (!buf || !buf.length) return undefined;
    return 'data:image/png;base64,' + Buffer.from(buf).toString('base64');
}

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { code, title, description, fix } = await request.json().catch(() => ({}) as any);
        if (!code || typeof code !== 'string') {
            return json({ error: 'code is required' }, { status: 400 });
        }

        const render = await renderCheck(code);

        // No Chromium on the host → we can't verify. Tell the client to fall back to its
        // own cover probe; never block a publish just because the gate is unavailable.
        if (!render.available) {
            return json({ available: false, ok: false, reason: 'no-browser' });
        }

        if (render.ok) {
            return json({
                available: true,
                ok: true,
                reason: 'ok',
                cover: coverDataUrl(render.coverPng),
                signals: {
                    motion: render.motion,
                    raf: render.raf,
                    keyListeners: render.keyListeners,
                    pointerListeners: render.pointerListeners
                }
            });
        }

        // Broken, and the caller explicitly doesn't want a repair → just report the verdict.
        if (fix === false) {
            return json({ available: true, ok: false, reason: render.reason, errors: render.errors });
        }

        // One bounded repair attempt, then re-verify. (The client may call again with the
        // returned code for a second attempt — it caps the total.)
        const issues = [render.reason || 'broken', ...(render.errors || []), ...staticValidate(code).issues];
        let fixed: string;
        try {
            fixed = await generateGameCode(buildFixPrompt(title, issues), description || undefined, code);
        } catch {
            // Repair generation failed — hand back the original verdict, no code change.
            return json({ available: true, ok: false, reason: render.reason, errors: render.errors });
        }

        const reRender = await renderCheck(fixed);
        return json({
            available: true,
            ok: reRender.available ? reRender.ok : false,
            reason: reRender.reason,
            code: fixed, // client adopts the repaired source whether or not it fully passed
            cover: coverDataUrl(reRender.coverPng),
            errors: reRender.errors,
            signals: { motion: reRender.motion, raf: reRender.raf }
        });
    } catch (error: any) {
        console.error('Verify failed:', error);
        return json({ available: false, ok: false, reason: 'verify-threw' }, { status: 500 });
    }
};
