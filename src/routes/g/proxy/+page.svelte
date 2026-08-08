<script lang="ts">
	import { onMount } from 'svelte';
	import HeroGameCard from '$lib/components/HeroGameCard.svelte';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { config } from '$lib/config';
	import { getCDNImageUrl } from '$lib/utils/cdn';

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	const proxyGame = {
		name: 'Private Search',
		developer: 'DuckDuckGo',
		image: '/logo.png',
		embedURL: 'https://duckduckgo.com',
		views: 999999
	};

	// Proxy logic removed as it is currently not functional
	/*
	let loadingProxy = true;
	let proxyFrame: HTMLIFrameElement;

	// Register service worker for Ultraviolet proxy
	async function registerServiceWorker() {
		try {
			await navigator.serviceWorker.register('/uv.js', {
				scope: (window as any).__uv$config.prefix
			});
		} catch (err) {
			console.error('Service worker registration failed:', err);
		}
	}

	// Encode URL using Ultraviolet config
	function encodeURL(url: string): string {
		const uvConfig = (window as any).__uv$config;
		return uvConfig.prefix + uvConfig.encodeUrl(url);
	}

	function loadFrame() {
		loadingProxy = false;
		if (proxyFrame) {
			proxyFrame.style.opacity = '1';
		}
	}

	function loadedFrame() {
		loadingProxy = false;
		if (proxyFrame) {
			proxyFrame.style.opacity = '1';
		}
	}
	*/

	onMount(() => {
		// Scroll to top when page loads
		window.scrollTo(0, 0);
		// registerServiceWorker();
	});
</script>

<svelte:head>
	<title>{config.branding.name} - Private Search</title>
	<meta property="og:title" content="{config.branding.name} - Private Search" />
	<meta name="description" content="Browse the web privately using DuckDuckGo!" />
	<meta property="og:description" content="Browse the web privately using DuckDuckGo!" />

	<script src="/uv/uv.config.js"></script>
	<script src="/uv/uv.bundle.js" defer></script>
	<script src="/uv.js" defer></script>
</svelte:head>

<div class="font-sans min-h-screen bg-base-200 p-4 text-base-content">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-6">
			<HeroGameCard game={proxyGame}>
				<div
					id="frame"
					class="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-base-100 p-8"
				>
					<div class="text-center">
						<h1 class="mb-4 text-4xl font-black">Private Search</h1>
						<p class="text-xl">This feature is currently not functional.</p>
					</div>
				</div>
			</HeroGameCard>

			<div class="rounded-3xl bg-base-100 p-6 shadow-sm">
				<h2 class="mb-2 text-xl font-black">About Private Search</h2>
				<p class="leading-relaxed text-base-content/80">
					Browse the web privately using DuckDuckGo directly within Kazwire. Your searches are
					proxied through our Ultraviolet service to help protect your privacy.
				</p>
			</div>
		</main>

		<!-- Right Column (Recommended Games) -->
		<aside class="flex flex-col gap-6">
			<div class="flex flex-col gap-4">
				<h3 class="px-2 text-lg font-black text-white drop-shadow-sm">Recommended</h3>
				<div class="grid grid-cols-2 gap-3">
					{#each mappedGames.slice(0, 6) as game}
						<a
							href={game.href}
							class="group relative aspect-square w-full overflow-hidden rounded-xl bg-base-100 shadow-sm transition-all hover:scale-105 hover:shadow-lg"
						>
							<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
							<div
								class="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
							>
								<span class="block truncate text-[10px] font-bold text-white">
									{game.title}
								</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</aside>
	</div>
</div>
