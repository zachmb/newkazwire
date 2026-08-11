import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPortfolio } from '$lib/server/oci';

export const GET: RequestHandler = async ({ url }) => {
    const uid = url.searchParams.get('uid') || '';
    const portfolio = await getPortfolio(uid);
    return json({ success: true, ...portfolio });
};
