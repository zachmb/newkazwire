import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buyShopItem } from '$lib/server/oci';

// uid is a client UUID (or legacy kz-… id); reject junk so hostile input can't
// grow the shared wallets/inventory files or smuggle odd characters into paths.
const UID_RE = /^[A-Za-z0-9_-]{4,64}$/;

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { uid, itemId } = (await request.json().catch(() => ({}))) as any;
        if (!uid || !itemId) return json({ error: 'uid and itemId required' }, { status: 400 });
        if (typeof uid !== 'string' || !UID_RE.test(uid) || typeof itemId !== 'string' || itemId.length > 64) {
            return json({ error: 'Invalid uid or itemId.' }, { status: 400 });
        }
        const result = await buyShopItem(uid, itemId);
        if (!result.ok) {
            return json({ error: result.error, balance: result.balance }, { status: 400 });
        }
        return json({ success: true, balance: result.balance, item: result.item });
    } catch (err) {
        console.error('[Shop buy API] error:', err);
        return json({ error: 'Purchase failed — nothing was charged. Try again.' }, { status: 500 });
    }
};
