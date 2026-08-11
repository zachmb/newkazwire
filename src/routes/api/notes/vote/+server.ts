import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { voteNote } from '$lib/server/oci';

export const POST: RequestHandler = async ({ request }) => {
    const { gameId, noteId, vote } = (await request.json().catch(() => ({}))) as any;
    if (!gameId || !noteId || (vote !== 'helpful' && vote !== 'notHelpful')) {
        return json({ error: 'gameId, noteId and a valid vote required' }, { status: 400 });
    }
    const note = await voteNote(gameId, noteId, vote);
    if (!note) return json({ error: 'Note not found' }, { status: 404 });
    return json({ success: true, note });
};
