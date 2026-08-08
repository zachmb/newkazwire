<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import GameCard from './GameCard.svelte';
	import BrandNavTile from './BrandNavTile.svelte';
	import RequestGameTile from './RequestGameTile.svelte';

	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';

	export let games: { title: string; image: string; href: string }[] = [];

	let mounted = false;
	onMount(() => {
		mounted = true;
	});

	import { config } from '$lib/config';

	// Sort games to show recently played first, then pinned games
	// We only do this on the client after mount to avoid hydration mismatch
	$: sortedGames =
		mounted && browser
			? (() => {
					const recentIds = $recentlyPlayed.map((g) => g.id);
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

					return [...recentGames, ...pinnedGames, ...otherGames];
			  })()
			: games;

	// Function to deterministically assign sizes based on href hash
	// This ensures a game maintains its size even if its index changes due to sorting
	function getSize(id: string) {
		// Simple hash function
		let hash = 0;
		for (let i = 0; i < id.length; i++) {
			hash = (hash << 5) - hash + id.charCodeAt(i);
			hash |= 0;
		}
		const i = Math.abs(hash) % 12;
		if (i === 0) return 'col-span-2 row-span-2'; // Large 2x2
		if (i === 3) return 'col-span-2 row-span-1'; // Wide 2x1
		if (i === 7) return 'col-span-1 row-span-2'; // Tall 1x2
		if (i === 10) return 'col-span-2 row-span-1'; // Wide 2x1
		return 'col-span-1 row-span-1'; // Standard 1x1
	}
</script>

<div
	class="grid grid-flow-dense auto-rows-[140px] grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8"
>
	<!-- Static Header Tiles -->
	<div class="relative z-10 col-span-1 row-span-1 overflow-hidden">
		<BrandNavTile />
	</div>

	<div class="relative z-10 col-span-1 row-span-1 overflow-hidden">
		<RequestGameTile />
	</div>

	{#each sortedGames as game (game.href + game.title)}
		<div class="{getSize(game.href)} relative overflow-hidden">
			<GameCard {...game} />
		</div>
	{/each}
</div>
