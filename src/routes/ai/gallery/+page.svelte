<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';

	let userGames: any[] = [];
	let isLoading = true;
	let error = '';
	let sort: 'new' | 'top' = 'new';
	let query = '';

	// Client-side search over the loaded gallery (title, description, creator).
	$: shownGames = query.trim()
		? userGames.filter((g) => {
				const q = query.trim().toLowerCase();
				return (
					(g.title || '').toLowerCase().includes(q) ||
					(g.description || '').toLowerCase().includes(q) ||
					(g.creatorName || '').toLowerCase().includes(q)
				);
			})
		: userGames;

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	// Cover for a game: the captured canvas snapshot if it has one, else generated
	// on-brand art so every game shows a real cover (never a blank tile).
	const coverFor = (g: any) =>
		g.coverUrl || `/api/ai/cover/${g.id}?t=${encodeURIComponent(g.title || 'AI Game')}`;

	async function fetchGallery() {
		isLoading = true;
		error = '';
		try {
			// Reads registry.json from OCI; sort is ranked server-side.
			const res = await fetch('/api/ai/gallery?sort=' + sort);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to fetch gallery');
			userGames = data.games || [];
		} catch (err: any) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	function setSort(s: 'new' | 'top') {
		if (s === sort) return;
		sort = s;
		fetchGallery();
	}

	onMount(() => {
		window.scrollTo(0, 0);
		fetchGallery();
	});
</script>

<svelte:head>
</svelte:head>

<div class="font-sans min-h-screen bg-base-200 p-4 text-base-content">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-6">
			<div
				class="flex flex-col items-center justify-between gap-4 rounded-box border border-base-content/10 bg-base-100 p-8 shadow-sm md:flex-row"
			>
				<div class="flex items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-base-content"
					>
						<Icon icon="mdi:view-gallery" class="text-4xl" />
					</div>
					<div>
						<h1 class="text-3xl font-black tracking-tight">AI Community Gallery</h1>
						<p class="opacity-70">Play and review games created by the community.</p>
					</div>
				</div>
				<div class="flex flex-wrap items-center justify-center gap-3">
					<!-- Search the community gallery -->
					<label
						class="flex items-center gap-2 rounded-full border border-base-content/10 bg-base-200 px-4 py-2 transition focus-within:border-primary/40"
					>
						<Icon icon="mdi:magnify" class="text-lg text-base-content/50" />
						<input
							type="search"
							bind:value={query}
							placeholder="Search games…"
							aria-label="Search community games"
							class="w-32 bg-transparent text-sm font-semibold placeholder:text-base-content/40 focus:outline-none sm:w-44"
						/>
					</label>
					<!-- Sort / recommendation toggle -->
					<div class="inline-flex rounded-full border border-base-content/10 bg-base-200 p-1">
						<button
							on:click={() => setSort('top')}
							class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition {sort === 'top' ? 'bg-primary text-white shadow-sm' : 'text-base-content/70 hover:text-primary'}"
						>
							<Icon icon="mdi:fire" /> Top
						</button>
						<button
							on:click={() => setSort('new')}
							class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition {sort === 'new' ? 'bg-primary text-white shadow-sm' : 'text-base-content/70 hover:text-primary'}"
						>
							<Icon icon="mdi:clock-outline" /> Newest
						</button>
					</div>
					<a href="/ai" class="btn btn-primary rounded-full font-black text-white">
						<Icon icon="mdi:creation" />
						Create
					</a>
				</div>
			</div>

			<div class="min-h-[400px] rounded-box border border-base-content/10 bg-base-100 p-6 shadow-sm">
				{#if isLoading}
					<div class="flex h-64 flex-col items-center justify-center gap-4 opacity-50">
						<Icon icon="line-md:loading-alt-loop" class="text-6xl" />
						<p class="font-bold">Loading community magic...</p>
					</div>
				{:else if error}
					<div class="alert alert-error rounded-xl">
						<Icon icon="mdi:alert-circle" />
						<span>{error}</span>
					</div>
				{:else if userGames.length === 0}
					<div class="flex h-64 flex-col items-center justify-center gap-4 text-center opacity-30">
						<Icon icon="mdi:controller-off" class="text-8xl" />
						<h3 class="text-2xl font-black">No AI games yet!</h3>
						<p>Be the first to create one in the Lab.</p>
					</div>
				{:else if shownGames.length === 0}
					<div class="flex h-64 flex-col items-center justify-center gap-3 text-center">
						<Icon icon="mdi:magnify" class="text-6xl opacity-20" />
						<h3 class="text-xl font-black opacity-60">Nothing matches “{query}”</h3>
						<button class="btn btn-sm rounded-full" on:click={() => (query = '')}>Clear search</button>
					</div>
				{:else}
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
						{#each shownGames as game}
							<a
								href="/ai/user-g/{game.id}"
								class="group flex flex-col overflow-hidden rounded-box border border-base-content/10 bg-base-200 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
							>
								<div class="relative aspect-video w-full bg-black">
									<img
										src={coverFor(game)}
										alt={game.title}
										loading="lazy"
										class="absolute inset-0 h-full w-full object-cover"
									/>
									{#if game.sourceGameId}
										<div class="badge badge-accent absolute right-2 top-2 font-bold shadow-md">
											REMIX
										</div>
									{/if}
								</div>
								<div class="flex flex-col p-4">
									<h3 class="truncate text-xl font-black">{game.title}</h3>
									<!-- Creator attribution: name + coarse location for every public game. -->
									<div class="mt-1 flex items-center gap-1 text-xs font-semibold opacity-60">
										<Icon icon="mdi:account-circle" class="text-sm" />
										<span class="truncate">{game.creatorName || 'Anonymous'}{#if game.creatorLocation} · {game.creatorLocation}{/if}</span>
									</div>
									<p class="mt-1 line-clamp-2 h-10 text-sm opacity-60">{game.description}</p>
									<div
										class="mt-4 flex items-center justify-between border-t border-neutral/5 pt-4"
									>
										<div class="flex items-center gap-1 text-primary">
											<Icon icon="mdi:star" />
											<span class="font-bold">{game.avgRating || 'New'}</span>
										</div>
										<span class="text-xs opacity-40"
											>{new Date(game.createdAt).toLocaleDateString()}</span
										>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>
