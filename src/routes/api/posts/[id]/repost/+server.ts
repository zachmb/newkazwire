import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { repostPost, upsertProfile } from '$lib/server/oci';
import { getRealIp, geolocate } from '$lib/server/ip';
import { cleanDisplayName } from '$lib/server/moderation';

export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
    try {
        const { uid, author } = (await request.json()) as any;
        if (!uid) return json({ error: 'A player name is required to repost.' }, { status: 400 });
        const location = await geolocate(getRealIp(request, getClientAddress));
        const name = cleanDisplayName(author);
        const post = await repostPost(params.id, { uid, author: name, location: location || undefined });
        if (!post) return json({ error: 'Post not found' }, { status: 404 });
        try { await upsertProfile(uid, name, location || undefined, { postsCount: 1 }); } catch { /* non-fatal */ }
        return json({ success: true, post });
    } catch (error: any) {
        console.error('Repost failed:', error);
        return json({ error: error.message || 'Failed to repost' }, { status: 500 });
    }
};
