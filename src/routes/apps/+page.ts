import type { PageLoad } from './$types';
import { apps } from '$lib/data/apps';

export const prerender = false;

export const load = (async ({ url }) => {
	const searchParam = url.searchParams.get('search') || '';

	const filteredApps = apps.filter(app =>
		app.title.toLowerCase().includes(searchParam.toLowerCase())
	);

	return { apps: filteredApps, searchParam };
}) satisfies PageLoad;
