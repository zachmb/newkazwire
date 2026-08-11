import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry, toPublicGame } from '$lib/server/oci';

export const GET: RequestHandler = async () => {
    try {
        const games = await getRegistry();
        // Sort by newest first
        games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        // Strip the raw creatorIp — the browser only ever gets the public creator name
        // + coarse location, never the IP.
        return json({ success: true, games: games.map(toPublicGame) });
    } catch (error: any) {
        console.error('Gallery fetch failure:', error);
        return json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
};
