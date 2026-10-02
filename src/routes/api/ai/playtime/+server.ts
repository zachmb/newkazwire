import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordPlaytime } from '$lib/server/oci';

/**
 * Record how long a player spent in an AI game. The client sends the accumulated
 * ACTIVE (tab-visible) milliseconds when the player leaves, usually via
 * navigator.sendBeacon. Duration is clamped server-side (see recordPlaytime), so a
 * bogus value can't skew the average. Fire-and-forget: always 200 so a beacon on
 * pagehide never surfaces an error.
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const { gameId, ms } = await request.json().catch(() => ({}) as any);
        if (typeof gameId === 'string' && gameId && typeof ms === 'number') {
            await recordPlaytime(gameId, ms);
        }
    } catch {
        /* never fail a telemetry beacon */
    }
    return json({ ok: true });
};
