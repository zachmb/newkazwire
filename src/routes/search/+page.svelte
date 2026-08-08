<script lang="ts">
	import { page } from '$app/stores';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import GameCard from '$lib/components/GameCard.svelte';
	import Icon from '@iconify/svelte';

	$: q = ($page.url.searchParams.get('q') || '').trim();
	$: results = q
		? games
				.filter(
					(g) =>
						g.title.toLowerCase().includes(q.toLowerCase()) ||
						g.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))
				)
				.map((g) => ({ ...g, image: getCDNImageUrl(g.image, 'game') }))
		: [];
</script>

<svelte:head>
	<title>Search{q ? ` — ${q}` : ''} · Kazwire</title>
</svelte:head>

<div class="mx-auto max-w-[1800px] px-3 py-6 sm:px-5">
	<h1 class="mb-1 flex items-center gap-2 text-2xl font-black text-base-content">
		<Icon icon="mdi:magnify" class="text-2xl text-primary" />
		{#if q}Results for “{q}”{:else}Search games{/if}
	</h1>
	<p class="mb-6 text-sm font-medium text-base-content/60">{results.length} game{results.length === 1 ? '' : 's'}</p>

	{#if q && results.length === 0}
		<div class="rounded-2xl bg-base-200 p-10 text-center">
			<p class="text-lg font-bold text-base-content">No games found for “{q}”.</p>
			<a href="/" class="mt-3 inline-block font-bold text-primary hover:underline">Browse all games</a>
		</div>
	{:else}
		<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
			{#each results as game (game.href)}
				<div class="aspect-square">
					<GameCard title={game.title} image={game.image} href={game.href} />
				</div>
			{/each}
		</div>
	{/if}
</div>
