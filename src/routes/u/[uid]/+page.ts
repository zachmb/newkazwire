import type { PageLoad } from './$types';

/**
 * Load the public profile server-side so the page's <title> (the player's name) is in
 * the SSR HTML, not just after a client fetch. Everything here is public. Never throws:
 * a 404 / failure returns nulls and the page renders its graceful "nothing public" state.
 */
export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const res = await fetch(`/api/profile/${encodeURIComponent(params.uid)}`);
		if (res.ok) {
			const data = await res.json();
			if (data?.success && data?.profile) {
				return {
					profile: data.profile,
					games: Array.isArray(data.games) ? data.games : [],
					posts: Array.isArray(data.posts) ? data.posts : []
				};
			}
		}
	} catch {
		/* treat as nothing-public */
	}
	return { profile: null, games: [], posts: [] };
};
