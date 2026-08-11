import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { recordStreakPing, getStreak } from '$lib/server/oci';

/**
 * POST /api/streak  { uid, name }
 * Records a daily play ping and returns the updated streak for this visitor.
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
		const name = typeof body?.name === 'string' ? body.name : '';

		if (!uid) {
			return json({ success: false, error: 'Missing uid' }, { status: 400 });
		}

		const record = await recordStreakPing(uid, name);

		// Never leak the raw record shape more than needed.
		return json({
			success: true,
			streak: record.streak,
			longest: record.longest,
			gamesPlayed: record.gamesPlayed,
			lastPlayedDate: record.lastPlayedDate
		});
	} catch (err: any) {
		console.error('[Streak API] POST error:', err);
		return json({ success: false, error: 'Failed to record streak' }, { status: 500 });
	}
};

/**
 * GET /api/streak?uid=  -> { streak, longest, gamesPlayed, lastPlayedDate }
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const uid = (url.searchParams.get('uid') || '').trim();
		if (!uid) {
			return json({ success: false, error: 'Missing uid' }, { status: 400 });
		}

		const record = await getStreak(uid);
		if (!record) {
			return json({
				success: true,
				streak: 0,
				longest: 0,
				gamesPlayed: 0,
				lastPlayedDate: null
			});
		}

		return json({
			success: true,
			streak: record.streak,
			longest: record.longest,
			gamesPlayed: record.gamesPlayed,
			lastPlayedDate: record.lastPlayedDate
		});
	} catch (err: any) {
		console.error('[Streak API] GET error:', err);
		return json({ success: false, error: 'Failed to fetch streak' }, { status: 500 });
	}
};
