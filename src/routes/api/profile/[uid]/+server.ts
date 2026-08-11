import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getProfile, getStreak, getRegistry, getPosts, toPublicGame } from '$lib/server/oci';

/**
 * Public profile for a uid: merges the profile aggregate with play-streak stats, the
 * user's created games, and their recent posts. No private fields (IP) are exposed.
 */
export const GET: RequestHandler = async ({ params }) => {
    const uid = params.uid;
    const profile = await getProfile(uid);
    const streak = await getStreak(uid);

    if (!profile && !streak) {
        return json({ error: 'Profile not found' }, { status: 404 });
    }

    const registry = await getRegistry();
    const games = registry
        .filter((g) => g.creatorUid === uid)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 24)
        .map(toPublicGame);

    const allPosts = await getPosts(500);
    const posts = allPosts.filter((p) => p.uid === uid).slice(0, 20);

    const name = profile?.name || streak?.name || 'Anonymous';
    return json({
        success: true,
        profile: {
            uid,
            name,
            location: profile?.location,
            gamesCreated: profile?.gamesCreated ?? games.length,
            postsCount: profile?.postsCount ?? posts.length,
            commentsCount: profile?.commentsCount ?? 0,
            gamesPlayed: streak?.gamesPlayed ?? 0,
            streak: streak?.streak ?? 0,
            longestStreak: streak?.longest ?? 0,
            joinedAt: profile?.joinedAt,
            lastActiveAt: profile?.lastActiveAt ?? streak?.updatedAt
        },
        games,
        posts
    });
};
