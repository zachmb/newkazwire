import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRegistry, getPlaytimes, toPublicGame, withPlaytime } from '$lib/server/oci';
import { moderateStrict, containsHardTerm } from '$lib/server/moderation';

// A game needs a few play sessions before its average playtime is trustworthy enough to
// rank it — otherwise one long session would rocket a fluke to the top of "Top".
const MIN_SESSIONS_FOR_RANK = 3;

/** Defense-in-depth: hide inappropriate games (older games predate the publish-time
 *  moderation gate) AND games the health check has confirmed broken + unfixable. A game
 *  only drops out once it's definitively 'broken'; unchecked games still show. */
function isDisplayable(g: any): boolean {
    if (moderateStrict(g.title, { maxLength: 80 }).blocked) return false;
    if (containsHardTerm(g.description)) return false;
    if (g.health === 'broken') return false;
    return true;
}

export const GET: RequestHandler = async ({ url }) => {
    try {
        const [registry, playtimes] = await Promise.all([getRegistry(), getPlaytimes()]);
        // Join avg playtime first so it's available to both the ranking and the cards.
        const games = withPlaytime(registry.filter(isDisplayable).map(toPublicGame), playtimes);
        const sort = url.searchParams.get('sort') === 'top' ? 'top' : 'new';
        const newer = (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        if (sort === 'top') {
            // "Top" = genuinely engaging games. Rank primarily by AVERAGE PLAYTIME (a far
            // better quality proxy than a sparse star rating), but only once a game has
            // enough sessions to be trustworthy; games without that evidence fall back to
            // rating, then recency, so fresh games stay discoverable below proven ones.
            const rankMs = (g: any) =>
                (g.playSessions || 0) >= MIN_SESSIONS_FOR_RANK ? g.avgPlaySec || 0 : -1;
            games.sort((a, b) => {
                const pa = rankMs(a);
                const pb = rankMs(b);
                if (pb !== pa) return pb - pa;
                const ra = a.avgRating || 0;
                const rb = b.avgRating || 0;
                if (rb !== ra) return rb - ra;
                return newer(a, b);
            });
        } else {
            games.sort(newer);
        }
        return json({ success: true, games });
    } catch (error: any) {
        console.error('Gallery fetch failure:', error);
        return json({ error: 'Failed to fetch gallery' }, { status: 500 });
    }
};
