import type { PageLoad } from './$types';
import { games as allGamesData } from '$lib/data/games';

export const load: PageLoad = (async ({ url }) => {
	const searchParam = url.searchParams.get('search')?.toLowerCase() || '';
	const tagParam = url.searchParams.get('tag')?.toLowerCase() || '';

	let filteredGames = [...allGamesData];

	if (searchParam) {
		filteredGames = filteredGames.filter(g =>
			g.title.toLowerCase().includes(searchParam) ||
			(g.description && g.description.toLowerCase().includes(searchParam))
		);
	}

	if (tagParam && tagParam !== 'all') {
		filteredGames = filteredGames.filter(g =>
			g.tags.some((t: string) => t.toLowerCase() === tagParam)
		);
	}

	// Calculate unique tags from all games
	const tags: string[] = [];
	allGamesData.forEach(game => {
		game.tags.forEach((tag: string) => {
			if (!tags.includes(tag)) {
				tags.push(tag);
			}
		});
	});

	return {
		games: filteredGames,
		tags,
		searchParam,
		tagParam
	};
});
