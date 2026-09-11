import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry, toPublicGame } from '$lib/server/oci';
import { moderateStrict, containsHardTerm } from '$lib/server/moderation';

export const GET: RequestHandler = async ({ params }) => {
    try {
        const registry = await getRegistry();
        const game = registry.find((g) => g.id === params.id);

        if (!game) {
            return json({ error: 'Game not found' }, { status: 404 });
        }

        // Don't serve a direct link to an inappropriate game (older games predate
        // the publish-time moderation gate).
        if (moderateStrict(game.title, { maxLength: 80 }).blocked || containsHardTerm(game.description)) {
            return json({ error: 'Game not found' }, { status: 404 });
        }

        // Strip the raw creatorIp before sending to the browser.
        return json({ success: true, game: toPublicGame(game) });
    } catch (error: any) {
        console.error('Game fetch failure:', error);
        return json({ error: 'Failed to fetch game' }, { status: 500 });
    }
};
