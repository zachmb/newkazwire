<script lang="ts">
	import { config } from '$lib/config';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import { userProfile } from '$lib/stores/userProfile';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameRow from '$lib/components/GameRow.svelte';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';

	export let data: any;

	type G = { title: string; image: string; href: string; tags?: string[] };

	$: games = (data.games as any[]).map((g) => ({
		...g,
		title: g.title || 'Untitled',
		image: getCDNImageUrl(g.image, 'game'),
		href: g.href,
		tags: g.tags || []
	})) as G[];

	const pinnedIds: string[] = (config as any).pinnedGames || [];
	const idOf = (g: G) => g.href.split('/').pop() || '';

	// Featured (hero) = first pinned game available
	$: featured =
		games.find((g) => pinnedIds.includes(idOf(g))) || games[0];

	// Popular = pinned games, in configured order
	$: popular = pinnedIds
		.map((id) => games.find((g) => idOf(g) === id))
		.filter(Boolean) as G[];

	// Recently played (client store) -> resolved games
	$: recent = ($recentlyPlayed || [])
		.map((r: any) => games.find((g) => idOf(g) === r.id))
		.filter(Boolean) as G[];

	// Favorites
	$: favorites = games.filter((g) => $userProfile.favoriteGames.includes(idOf(g)));

	// Build category rails from tags (top tags by count)
	$: tagCounts = (() => {
		const m: Record<string, number> = {};
		for (const g of games) for (const t of g.tags || []) m[t] = (m[t] || 0) + 1;
		return m;
	})();
	$: topTags = Object.entries(tagCounts)
		.filter(([, n]) => n >= 4)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([t]) => t);
	const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	$: rails = topTags.map((tag) => ({
		tag,
		id: 'cat-' + slug(tag),
		games: games.filter((g) => (g.tags || []).includes(tag)).slice(0, 18)
	}));

	// AI community games
	let aiGames: any[] = [];
	onMount(async () => {
		try {
			const res = await fetch('/api/ai/gallery');
			const j = await res.json();
			if (res.ok) aiGames = (j.games || []).slice(0, 12);
		} catch {
			/* non-critical */
		}
	});
</script>

<svelte:head>
	<title>{config.branding.name} — Play unblocked games</title>
	<meta property="og:title" content={config.branding.name} />
	<meta name="description" content={config.branding.description} />
	<meta property="og:description" content={config.branding.description} />
</svelte:head>

<div class="min-h-screen bg-base-100">
	<div class="mx-auto flex max-w-[1800px] flex-col gap-8 px-3 py-5 sm:px-5">
		<!-- HERO -->
		{#if featured}
			<section class="relative overflow-hidden rounded-3xl">
				<img src={featured.image} alt="" class="absolute inset-0 h-full w-full scale-110 object-cover blur-xl" aria-hidden="true" />
				<div class="absolute inset-0 bg-gradient-to-r from-[#0B1220]/95 via-[#0B1220]/80 to-[#2563EB]/50"></div>
				<div class="relative flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
					<img src={featured.image} alt={featured.title} class="h-40 w-40 flex-none rounded-2xl object-cover shadow-2xl ring-1 ring-white/20 sm:h-48 sm:w-48" />
					<div class="flex flex-col gap-3">
						<span class="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider text-[#FF9F1C]">
							<Icon icon="mdi:star" /> Featured
						</span>
						<h1 class="text-3xl font-black leading-tight text-white drop-shadow sm:text-5xl">{featured.title}</h1>
						<p class="max-w-xl text-sm font-medium text-white/80 sm:text-base">
							{config.branding.slogan} No downloads, no blocks — just click and play.
						</p>
						<div class="mt-1 flex flex-wrap items-center gap-3">
							<a href={featured.href} class="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-black text-white shadow-lg transition hover:brightness-110">
								<Icon icon="mdi:play" class="text-2xl" /> Play now
							</a>
							<a href="/proxy" class="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/25">
								<Icon icon="mdi:shield-lock" /> Open Proxy
							</a>
						</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- CATEGORY CHIPS -->
		{#if rails.length}
			<div class="row-scroll -mt-2 flex gap-2 overflow-x-auto pb-1">
				<a href="#top" class="flex-none rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-white">All</a>
				{#each rails as r}
					<a href={'#' + r.id} class="flex-none rounded-full bg-base-200 px-4 py-1.5 text-sm font-bold text-base-content/80 transition hover:bg-base-300 hover:text-base-content">{r.tag}</a>
				{/each}
			</div>
		{/if}

		<span id="top"></span>

		<!-- CONTINUE / FAVORITES -->
		{#if recent.length}
			<GameRow title="Continue playing" icon="mdi:history" games={recent} />
		{/if}
		{#if favorites.length}
			<GameRow title="Your favorites" icon="mdi:heart" games={favorites} />
		{/if}

		<!-- POPULAR -->
		{#if popular.length}
			<GameRow title="Popular now" icon="mdi:fire" games={popular} />
		{/if}

		<!-- AI COMMUNITY -->
		<section class="flex flex-col gap-3">
			<div class="flex items-end justify-between px-1">
				<h2 class="flex items-center gap-2 text-xl font-black tracking-tight text-base-content sm:text-2xl">
					<Icon icon="mdi:sparkles" class="text-2xl text-primary" /> Community creations
				</h2>
				<div class="flex items-center gap-3">
					<a href="/ai" class="text-sm font-bold text-primary hover:underline">Create yours</a>
					<a href="/ai/gallery" class="text-sm font-bold text-primary hover:underline">View all</a>
				</div>
			</div>
			{#if aiGames.length}
				<div class="row-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 py-3">
					{#each aiGames as g (g.id)}
						<a href={'/ai/user-g/' + g.id} class="group relative flex aspect-square w-36 flex-none snap-start flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 to-secondary/25 p-3 text-center ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-xl sm:w-40 md:w-44">
							<Icon icon="mdi:robot-happy" class="text-4xl text-base-content/70 transition group-hover:scale-110" />
							<span class="line-clamp-2 text-sm font-bold text-base-content">{g.title}</span>
							{#if g.avgRating}
								<span class="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-black/50 px-2 py-0.5 text-xs font-bold text-[#FF9F1C]"><Icon icon="mdi:star" class="text-xs" />{g.avgRating}</span>
							{/if}
						</a>
					{/each}
				</div>
			{:else}
				<a href="/ai" class="flex items-center gap-4 rounded-2xl border border-dashed border-base-300 bg-base-200 p-5 transition hover:border-primary">
					<div class="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Icon icon="mdi:sparkles" class="text-2xl" /></div>
					<div>
						<p class="font-black text-base-content">Make your own game with AI</p>
						<p class="text-sm text-base-content/70">Describe a game and publish it to the community — no code required.</p>
					</div>
				</a>
			{/if}
		</section>

		<!-- CATEGORY RAILS -->
		{#each rails as r}
			<div id={r.id} class="scroll-mt-24">
				<GameRow title={r.tag} games={r.games} />
			</div>
		{/each}

		<!-- ALL GAMES GRID -->
		<section class="flex flex-col gap-3">
			<h2 class="flex items-center gap-2 px-1 text-xl font-black tracking-tight text-base-content sm:text-2xl">
				<Icon icon="mdi:grid" class="text-2xl text-primary" /> All games
			</h2>
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
				{#each games as game (game.href)}
					<div class="aspect-square">
						<GameCard title={game.title} image={game.image} href={game.href} />
					</div>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.row-scroll {
		scrollbar-width: none;
	}
	.row-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
