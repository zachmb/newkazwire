import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getShopItems, addShopItem } from '$lib/server/oci';
import { cleanText, cleanDisplayName } from '$lib/server/moderation';

export const GET: RequestHandler = async () => {
    const items = await getShopItems();
    return json({ success: true, items });
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { uid, sellerName, title, description, price, icon } = (await request.json()) as any;
        if (!uid) return json({ error: 'A player name is required to list an item.' }, { status: 400 });

        const t = cleanText(title, { maxLength: 60 });
        if (t.blocked || !t.text) return json({ error: 'That title was blocked or empty.' }, { status: 400 });
        const d = cleanText(description, { maxLength: 240 });
        if (d.blocked) return json({ error: 'That description was blocked by our filter.' }, { status: 400 });

        const numericPrice = Math.floor(Number(price));
        if (!Number.isFinite(numericPrice) || numericPrice < 1) {
            return json({ error: 'Set a valid price (at least 1 Kazcoin).' }, { status: 400 });
        }

        const item = await addShopItem({
            sellerUid: uid,
            sellerName: cleanDisplayName(sellerName),
            title: t.text,
            description: d.text,
            icon: typeof icon === 'string' && icon.trim() ? icon.trim().slice(0, 40) : 'mdi:package-variant',
            price: numericPrice
        });
        return json({ success: true, item });
    } catch (error: any) {
        console.error('Add shop item failed:', error);
        return json({ error: error.message || 'Failed to list item' }, { status: 500 });
    }
};
