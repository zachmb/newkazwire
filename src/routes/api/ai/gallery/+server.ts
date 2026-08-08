import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry } from '$lib/server/oci';

export const GET: RequestHandler = async () => {
    try {
        const games = await getRegistry();
        // Sort by newest first
        games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return json({ success: true, games });
    } catch (error: any) {
        console.error('Gallery fetch failure:', error);
        return json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
};
