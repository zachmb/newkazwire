import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry } from '$lib/server/oci';

export const GET: RequestHandler = async ({ getClientAddress }) => {
    try {
        const clientIp = getClientAddress();
        const registry = await getRegistry();

        // Filter games created by this IP
        const userGames = registry.filter((g) => g.creatorIp === clientIp);

        // Sort by newest first
        userGames.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return json({
            success: true,
            games: userGames,
            ip: clientIp // Return IP for UI display if needed
        });
    } catch (error: any) {
        console.error('User games fetch failure:', error);
        return json({ error: 'Failed to fetch your games' }, { status: 500 });
    }
};
