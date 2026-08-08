<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';
	import { isSearchOpen } from '$lib/stores/search';
	import { games } from '$lib/data/games';

	import { getCDNImageUrl } from '$lib/utils/cdn';

	// Search logic
	let searchQuery = '';

	$: filteredGames = searchQuery
		? games.filter(
				(g) =>
					g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					g.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
		  )
		: [];

	$: mappedGames = filteredGames.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));
</script>

{#if $isSearchOpen}
	<div
		class="fixed inset-0 z-[9999] flex flex-col bg-black/80 p-4 backdrop-blur-md sm:p-8"
		transition:fade={{ duration: 200 }}
	>
		<!-- Close Button -->
		<button
			class="btn btn-circle btn-ghost absolute right-4 top-4 text-white hover:bg-white/10"
			on:click={() => ($isSearchOpen = false)}
		>
			<Icon icon="mdi:close" class="h-8 w-8" />
		</button>

		<!-- Search Bar -->
		<div class="mx-auto mt-20 w-full max-w-3xl" transition:fly={{ y: -20, duration: 300 }}>
			<div class="relative">
				<Icon
					icon="mdi:magnify"
					class="absolute left-6 top-1/2 h-8 w-8 -translate-y-1/2 text-neutral/50"
				/>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search for games..."
					class="w-full rounded-full bg-white py-6 pl-20 pr-8 text-2xl font-bold text-neutral shadow-2xl placeholder:text-neutral/30 focus:outline-none focus:ring-4 focus:ring-primary/50"
					autofocus
				/>
			</div>
		</div>

		<!-- Results -->
		<div
			class="mx-auto mt-12 grid w-full max-w-5xl grid-cols-2 gap-4 overflow-y-auto pb-20 md:grid-cols-4"
		>
			{#if searchQuery}
				{#if mappedGames.length > 0}
					{#each mappedGames as game}
						<a
							href={game.href}
							class="group relative aspect-square w-full overflow-hidden rounded-3xl bg-white shadow-lg transition-transform hover:scale-105"
							on:click={() => ($isSearchOpen = false)}
						>
							<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
							<div
								class="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<span class="block truncate text-xs font-bold text-white">{game.title}</span>
							</div>
						</a>
					{/each}
				{:else}
					<div class="col-span-full text-center text-xl font-bold text-white/50">
						No games found for "{searchQuery}"
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}
