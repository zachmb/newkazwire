import type { RequestHandler } from './$types';
import { generateGameCodeStream } from '$lib/server/deepseek';

export const POST: RequestHandler = async ({ request }) => {
    const { prompt, title, remixContext } = await request.json();

    if (!prompt || !title) {
        return new Response(JSON.stringify({ error: 'Prompt and title are required.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const stream = generateGameCodeStream(prompt, remixContext);

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
