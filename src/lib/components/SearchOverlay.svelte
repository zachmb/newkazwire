<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { isSearchOpen, searchQuery } from '$lib/stores/search';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import GameCard from '$lib/components/GameCard.svelte';

	const MAX_RESULTS = 60;

	// Live autofill: rank title-matches above tag-matches, cap for snappiness.
	$: q = $searchQuery.trim().toLowerCase();
	$: matches = q
		? (() => {
				const title: any[] = [];
				const tag: any[] = [];
				for (const g of games) {
					if (g.title.toLowerCase().includes(q)) title.push(g);
					else if (g.tags.some((t) => t.toLowerCase().includes(q))) tag.push(g);
				}
				return [...title, ...tag];
		  })()
		: [];
	$: shown = matches.slice(0, MAX_RESULTS).map((g) => ({ title: g.title, href: g.href, image: getCDNImageUrl(g.image, 'game') }));

	function close() {
		$isSearchOpen = false;
	}
	function onKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
			e.preventDefault();
			$isSearchOpen = !$isSearchOpen;
		} else if (e.key === 'Escape' && $isSearchOpen) {
			$isSearchOpen = false;
		}
	}
	// Enter opens the top result.
	function onInputKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && matches.length) {
			close();
			goto(matches[0].href);
		}
	}
</script>

<svelte:window on:keydown={onKeydown} />

{#if $isSearchOpen}
	<div class="fixed inset-0 z-[9999] flex flex-col bg-black/70 backdrop-blur-sm" transition:fade={{ duration: 150 }}>
		<!-- Search header -->
		<div class="border-b border-white/10 bg-base-100" transition:fly={{ y: -16, duration: 200 }}>
			<div class="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
				<Icon icon="mdi:magnify" class="h-6 w-6 flex-none text-base-content/40" />
				<!-- svelte-ignore a11y-autofocus -->
				<input
					type="text"
					bind:value={$searchQuery}
					on:keydown={onInputKey}
					placeholder="Search {games.length} games…"
					autofocus
					autocomplete="off"
					spellcheck="false"
					class="min-w-0 flex-1 bg-transparent text-xl font-bold text-base-content placeholder:font-semibold placeholder:text-base-content/30 focus:outline-none sm:text-2xl"
				/>
				{#if q}
					<span class="hidden flex-none text-sm font-bold text-base-content/40 sm:inline">
						{matches.length} result{matches.length === 1 ? '' : 's'}
					</span>
					<button
						class="grid h-8 w-8 flex-none place-items-center rounded-full text-base-content/50 transition hover:bg-base-200 hover:text-base-content"
						on:click={() => ($searchQuery = '')}
						aria-label="Clear search"
					>
						<Icon icon="mdi:close" class="h-5 w-5" />
					</button>
				{/if}
				<button
					class="flex-none rounded-full border border-base-content/10 px-3 py-1.5 text-xs font-bold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
					on:click={close}
				>
					Esc
				</button>
			</div>
		</div>

		<!-- Results -->
		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
				{#if !q}
					<div class="flex flex-col items-center justify-center gap-3 py-24 text-center text-base-content/40">
						<Icon icon="mdi:gamepad-variant" class="h-10 w-10" />
						<p class="text-lg font-bold">Start typing to search {games.length} games</p>
						<p class="text-sm">Search by title or category. Press Enter to open the top match.</p>
					</div>
				{:else if shown.length}
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
						{#each shown as g (g.href)}
							<div class="aspect-square" on:click={close} on:keydown role="none">
								<GameCard title={g.title} image={g.image} href={g.href} />
							</div>
						{/each}
					</div>
					{#if matches.length > shown.length}
						<p class="mt-6 text-center text-sm font-semibold text-base-content/40">
							Showing {shown.length} of {matches.length}. Keep typing to narrow it down.
						</p>
					{/if}
				{:else}
					<div class="flex flex-col items-center justify-center gap-3 py-24 text-center text-base-content/50">
						<Icon icon="mdi:magnify-close" class="h-10 w-10" />
						<p class="text-lg font-bold text-base-content/70">No games match “{$searchQuery}”</p>
						<p class="text-sm">Try a different title or category.</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
