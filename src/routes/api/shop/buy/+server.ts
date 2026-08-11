import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buyShopItem } from '$lib/server/oci';

export const POST: RequestHandler = async ({ request }) => {
    const { uid, itemId } = (await request.json().catch(() => ({}))) as any;
    if (!uid || !itemId) return json({ error: 'uid and itemId required' }, { status: 400 });
    const result = await buyShopItem(uid, itemId);
    if (!result.ok) {
        return json({ error: result.error, balance: result.balance }, { status: 400 });
    }
    return json({ success: true, balance: result.balance, item: result.item });
};
