import type { RequestHandler } from './$types';
import { generateGameCodeStream } from '$lib/server/deepseek';
import { moderateStrict } from '$lib/server/moderation';

export const POST: RequestHandler = async ({ request }) => {
    const { prompt, title, remixContext, remixCode } = await request.json();

    if (!prompt || !title) {
        return new Response(JSON.stringify({ error: 'Prompt and title are required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Moderation gate: reject inappropriate prompts/titles BEFORE spending a
    // generation. Strict policy — any slur/sexual/CSAM/profanity hit is refused.
    if (moderateStrict(prompt, { maxLength: 2000 }).blocked || moderateStrict(title, { maxLength: 80 }).blocked) {
        return new Response(
            JSON.stringify({ error: "Let's keep it school-appropriate — try a different idea or title." }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // remixCode (the full source HTML of the game being remixed) makes the AI edit the
    // REAL game rather than guessing from a description.
    const stream = generateGameCodeStream(prompt, remixContext, remixCode);

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            // Required by Cloudflare Workers to allow streaming
            'X-Accel-Buffering': 'no'
        }
    });
};
