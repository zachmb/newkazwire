import type { PageLoad } from './$types';

/**
 * Load the community game server-side so the page has a real <title> (the game's
 * name) in the SSR HTML — not just after a client fetch. Public data, so a universal
 * load is fine; it also runs on client navigation. Never throws: on any miss the page
 * falls back to its own client fetch + not-found handling.
 */
export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const res = await fetch(`/api/ai/user-g/${params.id}`);
		if (res.ok) {
			const data = await res.json();
			return { game: data?.game ?? null };
		}
	} catch {
		/* fall through to client fetch */
	}
	return { game: null };
};
