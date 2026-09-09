import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry, toPublicGame } from '$lib/server/oci';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const games = await getRegistry();
        const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'new';
        const newer = (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        if (sort === 'top') {
            // Recommendation ranking: highest-rated first; unrated ("New") games fall
            // back to newest so fresh games stay discoverable, just below rated ones.
            games.sort((a, b) => {
                const ra = a.avgRating || 0;
                const rb = b.avgRating || 0;
                if (rb !== ra) return rb - ra;
                return newer(a, b);
            });
        } else {
            games.sort(newer);
        }
        // Strip the raw creatorIp — the browser only ever gets the public creator name
        // + coarse location, never the IP.
        return json({ success: true, games: games.map(toPublicGame) });
    } catch (error: any) {
        console.error('Gallery fetch failure:', error);
        return json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
};
