<script lang="ts">
	import BrandNavTile from './BrandNavTile.svelte';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';
	import { registerBrandTile } from '$lib/stores/brandTile';
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	export let games: { title: string; image: string; href: string }[] = [];

	// While this rail is on screen the Nav drops its own wordmark (the brand tile
	// below is the site title) and the tile hangs flush from the nav bar.
	if (browser) {
		const unregister = registerBrandTile();
		onDestroy(unregister);
	}

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

<!-- -mt-4 cancels the page's top padding so the brand tile sits flush against the
     nav's bottom border and reads as one merged unit with the (now wordmark-less)
     nav — square top corners, card-round bottom corners. NOTE: no `sticky` here —
     the game pages wrap content in overflow-hidden, so sticky can never pin (the
     wrapper isn't the scroller) and its top offset just shoved the rail down,
     breaking the flush merge. -->
<!-- The rail fills its (absolutely-positioned) wrapper so the game column runs
     all the way to the bottom of the page WITHOUT contributing to the page
     height itself — the +1rem cancels the -mt-4 flush merge offset. The list
     scrolls internally when there are more games than fit. -->
<div
	data-kz-rail
	class="no-scrollbar -mt-4 flex h-[calc(100%+1rem)] w-full flex-col gap-3 overflow-y-auto"
>
	<!-- Brand Tile (merged into the nav above it) -->
	<div
		class="h-[148px] w-full flex-shrink-0 overflow-hidden rounded-bl-[var(--rounded-box,1rem)] rounded-br-[var(--rounded-box,1rem)] border border-t-0 border-base-content/10 bg-base-100 shadow-sm transition-all duration-200 hover:shadow-md"
	>
		<BrandNavTile />
	</div>

	{#each sortedGames as game}
		<a
			href={game.href}
			class="block h-[140px] w-full flex-shrink-0 overflow-hidden rounded-box border border-base-content/10 bg-base-100 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
			title={game.title}
		>
			<img src={game.image} alt={game.title} class="h-full w-full object-cover" loading="lazy" />
		</a>
	{/each}
</div>
