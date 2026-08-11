import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getComments, addComment, addReply, upsertProfile } from '$lib/server/oci';
import { getRealIp, geolocate } from '$lib/server/ip';
import { cleanText, cleanDisplayName } from '$lib/server/moderation';

export const GET: RequestHandler = async ({ url }) => {
    const gameId = url.searchParams.get('gameId');
    if (!gameId) return json({ error: 'gameId required' }, { status: 400 });
    const comments = await getComments(gameId);
    return json({ success: true, comments });
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
    try {
        const body = await request.json();
        const { gameId, uid, author, text, parentId } = body || {};
        if (!gameId) return json({ error: 'gameId required' }, { status: 400 });
        if (!uid) return json({ error: 'A player name is required to comment.' }, { status: 400 });

        const { text: clean, blocked } = cleanText(text, { maxLength: 500 });
        if (blocked || !clean) {
            return json({ error: 'That comment was blocked by our filter. Keep it friendly!' }, { status: 400 });
        }

        const ip = getRealIp(request, getClientAddress);
        const location = await geolocate(ip);
        const name = cleanDisplayName(author);
        const base = { uid, author: name, location: location || undefined, text: clean };

        let result;
        if (parentId) {
            result = await addReply(gameId, parentId, base);
            if (!result) return json({ error: 'Parent comment not found' }, { status: 404 });
        } else {
            result = await addComment(gameId, base);
        }

        try {
            await upsertProfile(uid, name, location || undefined, { commentsCount: 1 });
        } catch {
            /* non-fatal */
        }

        return json({ success: true, comment: result });
    } catch (error: any) {
        console.error('Add comment failed:', error);
        return json({ error: error.message || 'Failed to comment' }, { status: 500 });
    }
};
