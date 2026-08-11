import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPosts, addPost, upsertProfile } from '$lib/server/oci';
import { getRealIp, geolocate } from '$lib/server/ip';
import { cleanText, cleanDisplayName } from '$lib/server/moderation';

export const GET: RequestHandler = async ({ url }) => {
    const limit = Math.min(200, Number(url.searchParams.get('limit')) || 100);
    const posts = await getPosts(limit);
    return json({ success: true, posts });
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
    try {
        const body = await request.json();
        const { uid, author, text, gameId, gameTitle, link } = body || {};

        if (!uid) return json({ error: 'A player name is required to post.' }, { status: 400 });

        const { text: clean, blocked } = cleanText(text, { maxLength: 500 });
        if (blocked || !clean) {
            return json({ error: 'That post was blocked by our filter. Keep it friendly!' }, { status: 400 });
        }

        // Optional user link: accept only well-formed http/https URLs (blocks
        // javascript:, data:, etc.). Anything invalid is silently dropped.
        let safeLink: string | undefined;
        if (typeof link === 'string' && link.trim()) {
            try {
                const u = new URL(link.trim());
                if (u.protocol === 'http:' || u.protocol === 'https:') {
                    safeLink = u.toString().slice(0, 500);
                }
            } catch {
                /* not a valid URL — drop it */
            }
        }

        const ip = getRealIp(request, getClientAddress);
        const location = await geolocate(ip);
        const name = cleanDisplayName(author);

        const post = await addPost({
            uid,
            author: name,
            location: location || undefined,
            text: clean,
            gameId: typeof gameId === 'string' ? gameId : undefined,
            gameTitle: typeof gameTitle === 'string' ? gameTitle.slice(0, 120) : undefined,
            link: safeLink
        });

        // Best-effort profile activity bump.
        try {
            await upsertProfile(uid, name, location || undefined, { postsCount: 1 });
        } catch {
            /* non-fatal */
        }

        return json({ success: true, post });
    } catch (error: any) {
        console.error('Create post failed:', error);
        return json({ error: error.message || 'Failed to post' }, { status: 500 });
    }
};
