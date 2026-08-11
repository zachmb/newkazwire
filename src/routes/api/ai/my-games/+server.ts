import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry, toPublicGame } from '$lib/server/oci';
import { getRealIp } from '$lib/server/ip';

export const GET: RequestHandler = async ({ request, getClientAddress }) => {
    try {
        // Real client IP (behind nginx getClientAddress() is 127.0.0.1 — read XFF), so
        // "my games" matches the same IP the publish path now records.
        const clientIp = getRealIp(request, getClientAddress);
        const registry = await getRegistry();

        // Filter games created by this IP, then strip the raw IP from the response.
        const userGames = registry
            .filter((g) => g.creatorIp === clientIp)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(toPublicGame);

        return json({
            success: true,
            games: userGames
        });
    } catch (error: any) {
        console.error('User games fetch failure:', error);
        return json({ error: 'Failed to fetch your games' }, { status: 500 });
    }
};
