import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addPostReply, upsertProfile } from '$lib/server/oci';
import { getRealIp, geolocate } from '$lib/server/ip';
import { cleanText, cleanDisplayName } from '$lib/server/moderation';

export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
    try {
        const { uid, author, text } = (await request.json()) as any;
        if (!uid) return json({ error: 'A player name is required to reply.' }, { status: 400 });
        const { text: clean, blocked } = cleanText(text, { maxLength: 500 });
        if (blocked || !clean) return json({ error: 'That reply was blocked by our filter.' }, { status: 400 });

        const location = await geolocate(getRealIp(request, getClientAddress));
        const name = cleanDisplayName(author);
        const reply = await addPostReply(params.id, { uid, author: name, location: location || undefined, text: clean });
        if (!reply) return json({ error: 'Post not found' }, { status: 404 });

        try { await upsertProfile(uid, name, location || undefined, { commentsCount: 1 }); } catch { /* non-fatal */ }
        return json({ success: true, reply });
    } catch (error: any) {
        console.error('Post reply failed:', error);
        return json({ error: error.message || 'Failed to reply' }, { status: 500 });
    }
};
