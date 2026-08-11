import type { RequestHandler } from './$types';
import { generateGameCodeStream } from '$lib/server/deepseek';

export const POST: RequestHandler = async ({ request }) => {
    const { prompt, title, remixContext, remixCode } = await request.json();

    if (!prompt || !title) {
        return new Response(JSON.stringify({ error: 'Prompt and title are required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
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
