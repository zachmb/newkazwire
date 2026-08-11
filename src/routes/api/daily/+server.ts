import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { claimDaily } from '$lib/server/oci';

/** Claim the once-per-day Kazcoin bonus for a visitor. */
export const POST: RequestHandler = async ({ request }) => {
    const { uid } = (await request.json().catch(() => ({}))) as any;
    if (!uid) return json({ error: 'Missing uid' }, { status: 400 });
    const result = await claimDaily(uid);
    return json({ success: true, ...result });
};
