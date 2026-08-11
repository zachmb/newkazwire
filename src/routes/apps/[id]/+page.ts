import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';
import { apps } from '$lib/data/apps';

export const prerender = false;

export const load: PageLoad = async ({ params, data }) => {
	const slug = params.id;

	// Try to find static apps data
	const app = apps.find((a: any) => a.href === `/apps/${slug}` || a.id === slug);

	if (!app) {
		throw error(404, 'App not found');
	}

	return {
		app: {
			id: app.id || slug,
			title: app.title,
			description: app.description || 'No description available',
			developer: '',
			image: app.image, // Map thumbnail_url to image for compatibility
			embedURL: app.url || app.href, // real site to proxy (falls back to href)
			views: 1000,
			loves: 5          // Map likes to loves for compatibility with local state if needed
		}
	};
};
