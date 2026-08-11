import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry, toPublicGame } from '$lib/server/oci';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const registry = await getRegistry();
        const game = registry.find((g) => g.id === params.id);

        if (!game) {
            return json({ error: 'Game not found' }, { status: 404 });
        }

        // Strip the raw creatorIp before sending to the browser.
        return json({ success: true, game: toPublicGame(game) });
    } catch (error: any) {
        console.error('Game fetch failure:', error);
        return json({ error: 'Failed to fetch game' }, { status: 500 });
    }
};
