import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGameById, updateGameInRegistry, uploadToOCI } from '$lib/server/oci';
import { generateGameCode } from '$lib/server/deepseek';

// A community game can be regenerated at most twice via "report broken".
const MAX_REGENS = 2;

/**
 * Report a broken community game -> DeepSeek analyzes the current source and rebuilds a
 * fixed, playable version. Capped at MAX_REGENS per game.
 *
 * COGS safety: we check the cap first, call DeepSeek, and only increment the count AFTER
 * a confirmed successful rebuild (generateGameCode throws on API error / empty output),
 * so a failed regeneration never burns a slot. codeUrl gets a ?v=N cache-buster so the
 * player iframe loads the fixed build instead of a cached copy.
 */
export const POST: RequestHandler = async ({ params }) => {
    try {
        const id = params.id;
        const game = await getGameById(id);
        if (!game) return json({ error: 'Game not found' }, { status: 404 });

        const used = game.regenCount || 0;
        if (used >= MAX_REGENS) {
            return json(
                {
                    error: `This game has already been regenerated the maximum ${MAX_REGENS} times.`,
                    regenCount: used,
                    capped: true
                },
                { status: 429 }
            );
        }

        // Best-effort fetch of the current source so the model fixes the REAL game.
        let currentCode = '';
        try {
            const res = await fetch(game.codeUrl.split('?')[0], { cache: 'no-store' });
            if (res.ok) currentCode = await res.text();
        } catch {
            /* fall back to concept-only regen */
        }

        const fixPrompt =
            `This game was REPORTED BROKEN by players — it may show a black screen, throw ` +
            `errors, ignore input, or be unplayable. Analyze the source for bugs (merged ` +
            `tags, <script> nested inside <canvas>, undefined variables, a broken game loop, ` +
            `missing resize handling, unwired input) and output a COMPLETELY FIXED, fully ` +
            `playable version that keeps the original concept "${game.title}". Fix every bug.`;

        // Throws on failure -> we do NOT consume a regeneration slot.
        const fixed = await generateGameCode(fixPrompt, game.description, currentCode || undefined);

        const codePath = `user-games/${id}.html`;
        const baseUrl = await uploadToOCI(codePath, fixed, 'text/html');
        const nextCount = used + 1;

        const updated = await updateGameInRegistry(id, {
            codeUrl: `${baseUrl}?v=${nextCount}`,
            regenCount: nextCount,
            sizeBytes: new TextEncoder().encode(fixed).length
        });

        return json({
            success: true,
            regenCount: updated?.regenCount ?? nextCount,
            remaining: MAX_REGENS - (updated?.regenCount ?? nextCount)
        });
    } catch (error: any) {
        console.error('Report/regen failed:', error);
        return json({ error: error.message || 'Regeneration failed' }, { status: 500 });
    }
};
