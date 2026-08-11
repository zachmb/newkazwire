import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchProfiles } from '$lib/server/oci';

/** Search public player profiles by name. */
export const GET: RequestHandler = async ({ url }) => {
    const q = url.searchParams.get('q') || '';
    const players = await searchProfiles(q, 20);
    return json({ success: true, players });
};
