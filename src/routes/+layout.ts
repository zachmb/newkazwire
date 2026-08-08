import type { LayoutLoad } from './$types';
import { games as allGames } from '$lib/data/games';
import { apps as allApps } from '$lib/data/apps';

export const load: LayoutLoad = (async () => {
	// Calculate unique tags from all games
	const gameTags: string[] = [];
	allGames.forEach(game => {
		game.tags?.forEach((tag: string) => {
			if (!gameTags.includes(tag)) {
				gameTags.push(tag);
			}
		});
	});
	gameTags.sort((a, b) => a.localeCompare(b));

	return {
		games: allGames,
		apps: allApps,
		gameTags
	};
});
