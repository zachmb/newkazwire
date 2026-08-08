<script lang="ts">
	import BrandNavTile from './BrandNavTile.svelte';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';

	export let games: { title: string; image: string; href: string }[] = [];

	// Sort games to show recently played first
	let sortedGames: typeof games = [];
	import { config } from '$lib/config';

	recentlyPlayed.subscribe((recent) => {
		const recentIds = recent.map((g) => g.id);
		const pinnedIds = (config as any).pinnedGames || [];

		const recentGames = games.filter((game) => {
			const gameId = game.href.split('/').pop();
			return recentIds.includes(gameId || '');
		});

		const pinnedGames = games.filter((game) => {
			const gameId = game.href.split('/').pop() || '';
			return pinnedIds.includes(gameId) && !recentIds.includes(gameId);
		});

		const otherGames = games.filter((game) => {
			const gameId = game.href.split('/').pop() || '';
			return !recentIds.includes(gameId) && !pinnedIds.includes(gameId);
		});

		// Sort recent games by their position in the recently played list
		recentGames.sort((a, b) => {
			const aId = a.href.split('/').pop() || '';
			const bId = b.href.split('/').pop() || '';
			return recentIds.indexOf(aId) - recentIds.indexOf(bId);
		});

		// Maintain pinned order as defined in config
		pinnedGames.sort((a, b) => {
			const aId = a.href.split('/').pop() || '';
			const bId = b.href.split('/').pop() || '';
			return pinnedIds.indexOf(aId) - pinnedIds.indexOf(bId);
		});

		sortedGames = [...recentGames, ...pinnedGames, ...otherGames];
	});
</script>

<div
	class="no-scrollbar sticky top-4 flex h-[calc(100vh-2rem)] w-full flex-col gap-3 overflow-y-auto"
>
	<!-- Brand Tile -->
	<div
		class="h-[140px] w-full flex-shrink-0 overflow-hidden rounded-3xl bg-base-100 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md"
	>
		<BrandNavTile />
	</div>

	{#each sortedGames as game}
		<a
			href={game.href}
			class="block h-[140px] w-full flex-shrink-0 overflow-hidden rounded-3xl bg-base-100 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md"
			title={game.title}
		>
			<img src={game.image} alt={game.title} class="h-full w-full object-cover" loading="lazy" />
		</a>
	{/each}
</div>
