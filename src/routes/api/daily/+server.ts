import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { claimDaily } from '$lib/server/oci';

const UID_RE = /^[A-Za-z0-9_-]{4,64}$/;

/** Claim the once-per-day Kazcoin bonus for a visitor. */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const { uid } = (await request.json().catch(() => ({}))) as any;
        if (!uid || typeof uid !== 'string' || !UID_RE.test(uid)) {
            return json({ error: 'Missing or invalid uid' }, { status: 400 });
        }
        const result = await claimDaily(uid);
        return json({ success: true, ...result });
    } catch (err) {
        console.error('[Daily API] error:', err);
        return json({ success: false, error: 'Could not claim right now — try again.' }, { status: 500 });
    }
};
