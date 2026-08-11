import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNotes, addNote } from '$lib/server/oci';
import { cleanText, cleanDisplayName } from '$lib/server/moderation';

export const GET: RequestHandler = async ({ url }) => {
    const gameId = url.searchParams.get('gameId');
    if (!gameId) return json({ error: 'gameId required' }, { status: 400 });
    const notes = await getNotes(gameId);
    return json({ success: true, notes });
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { gameId, uid, author, text } = (await request.json()) as any;
        if (!gameId) return json({ error: 'gameId required' }, { status: 400 });
        if (!uid) return json({ error: 'A player name is required to add a note.' }, { status: 400 });

        const { text: clean, blocked } = cleanText(text, { maxLength: 280 });
        if (blocked || !clean) {
            return json({ error: 'That note was blocked by our filter.' }, { status: 400 });
        }

        const note = await addNote(gameId, { uid, author: cleanDisplayName(author), text: clean });
        return json({ success: true, note });
    } catch (error: any) {
        console.error('Add note failed:', error);
        return json({ error: error.message || 'Failed to add note' }, { status: 500 });
    }
};
