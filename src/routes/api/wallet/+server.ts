import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getWallet } from '$lib/server/oci';

export const GET: RequestHandler = async ({ url }) => {
    const uid = url.searchParams.get('uid') || '';
    const wallet = await getWallet(uid);
    return json({ success: true, coins: wallet.coins });
};
