import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLeaderboard } from '$lib/server/oci';

/**
 * GET /api/leaderboard
 * Returns the top 20 players by current streak (tiebreak: gamesPlayed).
 * All uid / private fields are stripped server-side.
 */
export const GET: RequestHandler = async () => {
	try {
		const leaders = await getLeaderboard(20);
		return json({ success: true, leaders });
	} catch (err: any) {
		console.error('[Leaderboard API] error:', err);
		return json({ success: false, error: 'Failed to fetch leaderboard' }, { status: 500 });
	}
};
