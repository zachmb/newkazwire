<script lang="ts">
	import { config } from '$lib/config';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import { userProfile } from '$lib/stores/userProfile';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';
	import HomeRail from '$lib/components/HomeRail.svelte';
	import Cloak from '$lib/components/Cloak.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let data: any;

	type G = { title: string; image: string; href: string; tags?: string[] };
	type Item = { title: string; subtitle?: string; image: string; href: string };

	// The wordmark/tagline stay domain-based (de-brand / anti-filter), but the LAYOUT is
	// restored to the original kazwire.com home: centered hero + horizontal game/app rails.
	$: host = $page.url.hostname;

	$: games = (data.games as any[]).map((g) => ({
		...g,
		title: g.title || 'Untitled',
		image: getCDNImageUrl(g.image, 'game'),
		href: g.href,
		tags: g.tags || []
	})) as G[];

	// Apps rail (original home showed apps first, above the game rails)
	const resolveAppImg = (img: string) =>
		!img ? '' : /^(https?:)?\/\//.test(img) || img.startsWith('/') ? img : getCDNImageUrl(img, 'app');
	$: apps = ((data.apps as any[]) || []).map((a) => ({
		title: a.title,
		subtitle: a.description,
		image: resolveAppImg(a.image),
		href: a.href
	})) as Item[];

	const pinnedIds: string[] = (config as any).pinnedGames || [];
	const idOf = (g: G) => g.href.split('/').pop() || '';

	const toItem = (g: G): Item => ({ title: g.title, image: g.image, href: g.href });

	// Popular = pinned games, in configured order (then fall back to the first games)
	$: popular = (() => {
		const pinned = pinnedIds
			.map((id) => games.find((g) => idOf(g) === id))
			.filter(Boolean) as G[];
		const rest = games.filter((g) => !pinnedIds.includes(idOf(g)));
		return [...pinned, ...rest].slice(0, 18).map(toItem);
	})();

	// Recently played (client store) -> resolved games
	$: recent = ($recentlyPlayed || [])
		.map((r: any) => games.find((g) => idOf(g) === r.id))
		.filter(Boolean)
		.map((g) => toItem(g as G)) as Item[];

	// Favorites
	$: favorites = games
		.filter((g) => $userProfile.favoriteGames.includes(idOf(g)))
		.map(toItem) as Item[];

	// Category rails from tags (top tags by count)
	$: tagCounts = (() => {
		const m: Record<string, number> = {};
		for (const g of games) for (const t of g.tags || []) m[t] = (m[t] || 0) + 1;
		return m;
	})();
	$: topTags = Object.entries(tagCounts)
		.filter(([, n]) => n >= 4)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 12)
		.map(([t]) => t);
	$: rails = topTags.map((tag) => ({
		tag,
		games: games.filter((g) => (g.tags || []).includes(tag)).slice(0, 18).map(toItem)
	}));

	// AI community games (kept as a rail so the flagship new feature stays surfaced)
	let community: Item[] = [];
	onMount(async () => {
		try {
			const res = await fetch('/api/ai/gallery');
			const j = await res.json();
			if (res.ok)
				community = (j.games || []).slice(0, 12).map((g: any) => ({
					title: g.title || 'Untitled',
					image: g.cover || g.image || '',
					href: '/ai/user-g/' + g.id
				}));
		} catch {
			/* non-critical */
		}
	});
</script>

<svelte:head>
	<meta property="og:title" content={$page.url.hostname} />
	<meta name="description" content={config.branding.description} />
	<meta property="og:description" content={config.branding.description} />
</svelte:head>

<div class="min-h-screen w-full bg-base-100">
	<!-- HERO — flat, left-aligned editorial: logo + wordmark + tagline + one primary CTA -->
	<section class="kz-wide pb-10 pt-8 md:pb-14 md:pt-12">
		<div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
			<img
				src="/logo.png"
				alt=""
				class="h-24 w-24 flex-none rounded-box object-contain sm:h-28 sm:w-28"
			/>
			<div class="max-w-2xl">
				<h1 class="text-4xl font-black tracking-tight sm:text-6xl"><Cloak text={host} /></h1>
				<p class="mt-3 text-lg leading-relaxed text-base-content/60 sm:text-xl">
					Enjoy free, fast, and safe gaming and browsing.
				</p>
				<div class="mt-6 flex flex-wrap gap-3">
					<a href="#games" class="btn btn-primary">Play now</a>
					<a href="/apps" class="btn btn-ghost border border-base-content/15">Browse apps</a>
				</div>
			</div>
		</div>
	</section>

	<!-- RAILS — apps first, then popular/continue/favorites, community, then categories -->
	<div class="kz-wide flex flex-col gap-9 pb-16 md:gap-11">
		<HomeRail title="Apps" viewMoreHref="/apps" items={apps} />

		<span id="games"></span>
		<HomeRail title="Popular" viewMoreHref="/g" items={popular} />

		{#if recent.length}
			<HomeRail title="Continue playing" items={recent} />
		{/if}
		{#if favorites.length}
			<HomeRail title="Your favorites" items={favorites} />
		{/if}

		<HomeRail title="Community creations" viewMoreHref="/ai/gallery" items={community} />

		{#each rails as r}
			<HomeRail title={r.tag} viewMoreHref="/g" items={r.games} />
		{/each}
	</div>
</div>
