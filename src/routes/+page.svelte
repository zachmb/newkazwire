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
		<!--
			HERO — full-bleed featured banner grounded in the streaming home heroes pulled
			via Mobbin MCP: Netflix (mobbin.com/screens/651b69e1-68af-49a9-9b27-687559314100),
			HBO Max (mobbin.com/screens/d66a0b5c-d682-4ca7-b6ce-4b7cb91f4944) and Prime Video
			(mobbin.com/screens/3e299f78-7290-4469-a99f-0e95f9ee2b17). A real cinematic still
			runs edge to edge with an oversized title bottom-left over a single left-to-right
			dark scrim — no blur-orb, no thumbnail-on-blurred-bg, no multi-hue gradient (the
			AI-template tells the old hero had).
		-->
		{#if featured}
			<section class="relative aspect-[16/10] overflow-hidden rounded-2xl ring-1 ring-black/10 sm:aspect-[21/9]">
				<img src={featured.image} alt="" class="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
				<div class="absolute inset-0 bg-gradient-to-t from-[#0B1220] via-[#0B1220]/55 to-transparent sm:bg-gradient-to-r sm:from-[#0B1220] sm:via-[#0B1220]/70 sm:to-transparent"></div>
				<div class="absolute inset-0 flex flex-col justify-end gap-3 p-5 sm:max-w-2xl sm:justify-center sm:p-10">
					<span class="flex w-fit items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
						<Icon icon="mdi:fire" class="text-sm" /> Featured game
					</span>
					<h1 class="text-3xl font-black leading-[1.02] tracking-tight text-white sm:text-6xl">{featured.title}</h1>
					<p class="max-w-lg text-sm font-medium text-white/85 sm:text-lg">
						{config.branding.slogan} No downloads, no blocks — just click and play.
					</p>
					<div class="mt-1 flex flex-wrap items-center gap-2.5">
						<a href={featured.href} class="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-base font-bold text-white transition hover:brightness-110">
							<Icon icon="mdi:play" class="text-xl" /> Play now
						</a>
						<a href="/proxy" class="flex items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 text-base font-semibold text-white ring-1 ring-white/25 backdrop-blur-sm transition hover:bg-white/25">
							<Icon icon="mdi:shield-lock" /> Open Proxy
						</a>
					</div>
				</div>
			</section>
		{/if}

		<!-- CATEGORY CHIPS — flat filter chips per YouTube Playables / Netflix top-of-grid filters -->
		{#if rails.length}
			<div class="row-scroll -mt-2 flex gap-2 overflow-x-auto pb-1">
				<a href="#top" class="flex-none rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white">All</a>
				{#each rails as r}
					<a href={'#' + r.id} class="flex-none rounded-lg bg-base-200 px-4 py-1.5 text-sm font-semibold text-base-content/80 ring-1 ring-base-300 transition hover:bg-base-100 hover:text-primary hover:ring-primary/40">{r.tag}</a>
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
				<h2 class="flex items-center gap-2 text-lg font-bold tracking-tight text-base-content sm:text-xl">
					<Icon icon="mdi:sparkles" class="text-xl text-primary" /> Community creations
				</h2>
				<div class="flex items-center gap-3">
					<a href="/ai" class="text-sm font-semibold text-primary hover:underline">Create yours</a>
					<a href="/ai/gallery" class="text-sm font-semibold text-base-content/60 hover:text-primary">View all</a>
				</div>
			</div>
			{#if aiGames.length}
				<div class="row-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 py-3">
					{#each aiGames as g (g.id)}
						<a href={'/ai/user-g/' + g.id} class="group relative flex aspect-square w-36 flex-none snap-start flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-base-200 p-3 text-center ring-1 ring-base-300 transition hover:-translate-y-0.5 hover:ring-primary sm:w-40 md:w-44">
							<Icon icon="mdi:robot-happy" class="text-4xl text-primary transition group-hover:scale-110" />
							<span class="line-clamp-2 text-sm font-semibold text-base-content">{g.title}</span>
							{#if g.avgRating}
								<span class="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-bold text-[#FF9F1C]"><Icon icon="mdi:star" class="text-xs" />{g.avgRating}</span>
							{/if}
						</a>
					{/each}
				</div>
			{:else}
				<a href="/ai" class="flex items-center gap-4 rounded-xl border border-dashed border-base-300 bg-base-200 p-5 transition hover:border-primary hover:bg-base-100">
					<div class="grid h-12 w-12 place-items-center rounded-lg bg-primary/15 text-primary"><Icon icon="mdi:sparkles" class="text-2xl" /></div>
					<div>
						<p class="font-bold text-base-content">Make your own game with AI</p>
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

		<!-- ALL GAMES GRID — tight poster grid per YouTube Playables / Amazon games browse -->
		<section class="flex flex-col gap-3">
			<div class="flex items-center justify-between border-b border-base-300 px-1 pb-2">
				<h2 class="flex items-center gap-2 text-lg font-bold tracking-tight text-base-content sm:text-xl">
					<Icon icon="mdi:grid" class="text-xl text-primary" /> All games
				</h2>
				<span class="text-sm font-medium text-base-content/50">{games.length} games</span>
			</div>
			<div class="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
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
