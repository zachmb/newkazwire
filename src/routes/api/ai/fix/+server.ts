import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateGameCode, buildFixPrompt } from '$lib/server/deepseek';
import { staticValidate } from '$lib/server/gamehealth';

/**
 * Pre-publish auto-fix: the generator client renders a freshly-made game, and if it's
 * broken (black screen / JS error / blank canvas) it calls this to get a repaired
 * version BEFORE the game is ever published. Same DeepSeek "analyze + rebuild" path the
 * "report broken" flow uses, but synchronous and stateless (no registry entry yet).
 *
 * Throws-on-failure is swallowed into a 500 so the client can decide to publish the
 * best version it has rather than hang.
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const { code, title, description, issues } = await request.json().catch(() => ({}) as any);
        if (!code || typeof code !== 'string') {
            return json({ error: 'code is required' }, { status: 400 });
        }

        // Surface the concrete structural problems we can detect so the model targets them.
        const detected = staticValidate(code).issues;
        const allIssues = [...(Array.isArray(issues) ? issues : []), ...detected];

        const fixed = await generateGameCode(buildFixPrompt(title, allIssues), description || undefined, code);
        return json({ success: true, code: fixed });
    } catch (error: any) {
        console.error('Pre-publish fix failed:', error);
        return json({ error: error.message || 'Fix failed' }, { status: 500 });
    }
};
