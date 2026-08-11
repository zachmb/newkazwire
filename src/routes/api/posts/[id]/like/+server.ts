import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { likePost } from '$lib/server/oci';

export const POST: RequestHandler = async ({ params, request }) => {
    const body = await request.json().catch(() => ({}));
    const delta = body?.unlike ? -1 : 1;
    const likes = await likePost(params.id, delta);
    if (likes === null) return json({ error: 'Post not found' }, { status: 404 });
    return json({ success: true, likes });
};
