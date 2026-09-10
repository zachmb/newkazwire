import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWallet } from '$lib/server/oci';

export const GET: RequestHandler = async ({ url }) => {
    try {
        const uid = url.searchParams.get('uid') || '';
        const wallet = await getWallet(uid.slice(0, 64));
        return json({ success: true, coins: wallet.coins });
    } catch (err) {
        console.error('[Wallet API] error:', err);
        return json({ success: false, coins: 0, error: 'Wallet unavailable right now.' }, { status: 500 });
    }
};
