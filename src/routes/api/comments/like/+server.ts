import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { likeComment } from '$lib/server/oci';

export const POST: RequestHandler = async ({ request }) => {
    const { gameId, commentId, replyId, unlike } = (await request.json().catch(() => ({}))) as any;
    if (!gameId || !commentId) return json({ error: 'gameId and commentId required' }, { status: 400 });
    const likes = await likeComment(gameId, commentId, replyId, unlike ? -1 : 1);
    if (likes === null) return json({ error: 'Comment not found' }, { status: 404 });
    return json({ success: true, likes });
};
