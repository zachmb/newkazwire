import { redirect } from '@sveltejs/kit';

// The vertical game/post swiper now lives at /feed itself. Keep this old path
// working for any bookmarks by redirecting up to the canonical feed.
export const load = () => {
	throw redirect(308, '/feed');
};
