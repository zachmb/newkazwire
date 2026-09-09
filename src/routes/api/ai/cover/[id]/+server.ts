import type { RequestHandler } from './$types';
import { coverSvg } from '$lib/server/gamecover';

// Generated cover art for an AI game (used when it has no canvas snapshot). Seeded
// by the game id; the title rides in ?t= so we don't need a registry read per cover.
export const GET: RequestHandler = ({ params, url }) => {
	const title = url.searchParams.get('t') || 'AI Game';
	const svg = coverSvg(title, params.id);
	return new Response(svg, {
		headers: {
			'content-type': 'image/svg+xml; charset=utf-8',
			'cache-control': 'public, max-age=604800, immutable'
		}
	});
};
