import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listMarket } from '$lib/server/oci';

export const GET: RequestHandler = async () => {
    const assets = await listMarket(60);
    return json({ success: true, assets });
};
