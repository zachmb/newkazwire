<script lang="ts">
	import { config } from '$lib/config';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import { userProfile } from '$lib/stores/userProfile';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';
	import HomeRail from '$lib/components/HomeRail.svelte';
	import Cloak from '$lib/components/Cloak.svelte';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	// The four things you can do, surfaced as quick-access cards in the hero so the
	// landing makes them obvious (game generator, private browser, apps, multiplayer).
	const quickActions = [
		{ label: 'Create with AI', sub: 'Make a game from a prompt', href: '/ai', icon: 'mdi:sparkles' },
		{ label: 'Private browser', sub: 'Open any site', href: '/study', icon: 'mdi:shield-lock' },
		{ label: 'Apps', sub: 'Tools & extras', href: '/apps', icon: 'ri:apps-2-fill' },
		{ label: 'Game rooms', sub: 'Join or create a room', href: '/rooms', icon: 'mdi:account-group' }
	];

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
	<!-- HERO — flat editorial: wordmark + tagline, then the 4 things you can do, then
	     a clear cue to scroll into the games library below. -->
	<section class="kz-wide pb-8 pt-8 md:pt-12">
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
			</div>
		</div>

		<!-- Quick access to the four core destinations -->
		<div class="mt-7 grid grid-cols-2 gap-3 sm:mt-8 lg:grid-cols-4">
			{#each quickActions as q}
				<a href={q.href} class="kz-card kz-card-hover flex items-center gap-3 p-4">
					<span class="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary/10 text-primary">
						<Icon icon={q.icon} class="text-xl" />
					</span>
					<span class="min-w-0">
						<span class="block text-sm font-black leading-tight text-base-content">{q.label}</span>
						<span class="block truncate text-xs text-base-content/60">{q.sub}</span>
					</span>
				</a>
			{/each}
		</div>

		<!-- Scroll cue into the library — a real, tappable pill so it reads actionable. -->
		<div class="mt-7 flex justify-center sm:mt-8">
			<a
				href="#games"
				class="inline-flex items-center gap-2 rounded-full border border-base-content/10 bg-base-200 px-5 py-2.5 text-sm font-bold text-base-content transition hover:border-primary hover:text-primary"
			>
				<Icon icon="mdi:gamepad-variant" class="text-lg text-primary" />
				Browse {games.length}+ games
				<Icon icon="mdi:chevron-down" class="animate-bounce text-lg" />
			</a>
		</div>
	</section>

	<!-- RAILS — games lead (popular/continue/favorites), then apps, community, categories -->
	<div class="kz-wide flex flex-col gap-9 scroll-mt-24 pb-16 md:gap-11" id="games">
		<HomeRail title="Popular" viewMoreHref="/g" items={popular} />

		{#if recent.length}
			<HomeRail title="Continue playing" items={recent} />
		{/if}
		{#if favorites.length}
			<HomeRail title="Your favorites" items={favorites} />
		{/if}

		<HomeRail title="Apps" viewMoreHref="/apps" items={apps} />
		<HomeRail title="Community creations" viewMoreHref="/ai/gallery" items={community} />

		{#each rails as r}
			<HomeRail title={r.tag} viewMoreHref="/g" items={r.games} />
		{/each}
	</div>
</div>
