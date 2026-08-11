import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tradeMarket } from '$lib/server/oci';
import { cleanText } from '$lib/server/moderation';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { uid, assetId, kind, title, action, amount } = (await request.json()) as any;
        if (!uid || !assetId) return json({ error: 'uid and assetId required' }, { status: 400 });
        if (action !== 'buy' && action !== 'sell') return json({ error: 'Invalid action' }, { status: 400 });

        // Sanitize a client-supplied title used when an asset is first created.
        let cleanTitle: string | undefined;
        if (title) {
            const c = cleanText(title, { maxLength: 80 });
            cleanTitle = c.text || undefined;
        }

        const result = await tradeMarket(uid, {
            assetId: String(assetId).slice(0, 120),
            kind: kind === 'ai' || kind === 'post' ? kind : kind === 'game' ? 'game' : undefined,
            title: cleanTitle,
            action,
            amount: Number(amount)
        });
        if (!result.ok) return json({ error: result.error, balance: result.balance }, { status: 400 });
        return json({ success: true, balance: result.balance, asset: result.asset, shares: result.shares });
    } catch (error: any) {
        console.error('Market trade failed:', error);
        return json({ error: error.message || 'Trade failed' }, { status: 500 });
    }
};
