<script lang="ts" context="module">
	declare var __uv$config: any;
</script>

<script lang="ts">
	import type { PageData } from './$types';
	export let data: PageData;

	import { config } from '$lib/config';
	import { getCDNImageUrl } from '$lib/utils/cdn';

	import { onMount, setContext } from 'svelte';
	import { enhance } from '$app/forms';
	import HeroGameCard from '$lib/components/HeroGameCard.svelte';
	import GameRail from '$lib/components/GameRail.svelte';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';

	// Mock data for recommendations and rail
	const mockGames = [
		{
			title: '10 Minutes Till Dawn',
			image: '10-minutes-till-dawn.png',
			href: '/g/10-minutes-till-dawn'
		},
		{ title: '1v1.lol', image: '1v1-lol.png', href: '/g/1v1-lol' },
		{ title: '2048', image: '2048.png', href: '/g/2048' },
		{ title: 'Slope', image: 'slope.png', href: '/g/slope' },
		{ title: 'Subway Surfers', image: 'subway-surfers.png', href: '/g/subway-surfers' },
		{ title: 'Retro Bowl', image: 'retro-bowl.png', href: '/g/retro-bowl' },
		{ title: 'Temple Run 2', image: 'temple-run-2.png', href: '/g/temple-run-2' },
		{ title: 'Super Mario 64', image: 'super-mario-64.png', href: '/g/super-mario-64' }
	];

	$: localizedMockGames = mockGames.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image, 'game')
	}));

	// Turns a search into a valid URL
	function search(input: string) {
		let template: string = 'https://www.google.com/search?q=%s&hl=en';
		try {
			// input is a valid URL:
			// eg: https://example.com, https://example.com/test?q=param
			return new URL(input).toString();
		} catch (err) {
			// input was not a valid URL
		}

		try {
			// input is a valid URL when http:// is added to the start:
			// eg: example.com, https://example.com/test?q=param
			const url: URL = new URL(`http://${input}`);
			// only if the hostname has a TLD/subdomain
			if (url.hostname.includes('.')) return url.toString();
		} catch (err) {
			// input was not valid URL
		}

		// input may have been a valid URL, however the hostname was invalid

		// Attempts to convert the input to a fully qualified URL have failed
		// Treat the input as a search query
		return template.replace('%s', encodeURIComponent(input));
	}

	function encodeURL(url: string): string {
		if (!browser) {
			return url;
		}
		// Check if __uv$config is defined before using it
		if (typeof __uv$config === 'undefined') {
			console.warn('Ultraviolet config not loaded yet, returning raw URL');
			return url;
		}

		// check if the service worker is installed
		navigator.serviceWorker.getRegistrations().then((registrations) => {
			if (registrations.length === 0) {
				// Service worker is not installed so register it
				registerServiceWorker();
			}
		});

		return __uv$config.prefix + __uv$config.encodeUrl(search(url));
	}

	function registerServiceWorker() {
		// Register the service worker
		if (typeof __uv$config === 'undefined' || __uv$config.prefix === undefined) {
			console.warn('Service worker config not ready yet');
			// wait 1 second and try again
			setTimeout(registerServiceWorker, 1000);
			return;
		}
		navigator.serviceWorker.register('/uv.js', { scope: __uv$config.prefix }).then((reg) => {
			if (reg.installing) {
				const sw = reg.installing || reg.waiting;
				sw.onstatechange = function () {
					if (sw.state === 'installed') {
						// SW installed.  Refresh page so SW can respond with SW-enabled page.
						window.location.reload();
					}
				};
			}
		});
	}

	let canShare: boolean = false;
	onMount(() => {
		registerServiceWorker();

		// Check if the browser supports the share API
		if (navigator.canShare({ url: window.location.href })) {
			canShare = true;
		}

		// Fire event when its finished rendering
		const event = new CustomEvent('rendered', {
			detail: {
				name: 'app',
				id: data.app.id
			}
		});

		window.dispatchEvent(event);
	});

	// Fullscreen the iframe
	function fullScreen() {
		const iframe: HTMLIFrameElement = document.getElementById('iframe') as HTMLIFrameElement;
		iframe.requestFullscreen();
	}

	let expanded: boolean = false;
	// Expand the iframe to fill the screen
	function expandiFrame(): void {
		if (!loadedFrame) {
			return;
		}

		const document: Document = window.document;
		const frame: HTMLIFrameElement = document.getElementById('iframe') as HTMLIFrameElement;

		document.body.style.overflow = 'hidden';
		// Settings required for the frame to fill the screen
		frame.style.position = 'fixed';
		frame.style.top = '0px';
		frame.style.bottom = '0px';
		frame.style.left = '0px';
		frame.style.right = '0px';
		frame.style.height = '100%';
		frame.style.width = '100%';
		frame.style.zIndex = '500';
		frame.style.border = 'none';

		frame.classList.toggle('rounded-t-lg');

		expanded = true;
	}

	function shrinkiFrame() {
		const document: Document = window.document;
		const frame: HTMLIFrameElement = document.getElementById('iframe') as HTMLIFrameElement;

		document.body.style.overflow = 'auto';
		// Settings required for the frame to fill the screen
		frame.style.position = 'relative';
		frame.style.top = '0px';
		frame.style.bottom = '0px';
		frame.style.left = '0px';
		frame.style.right = '0px';
		frame.style.height = '100%';
		frame.style.width = '100%';
		frame.style.zIndex = '9999';
		frame.style.border = 'none';

		frame.classList.toggle('rounded-t-lg');

		expanded = false;
	}

	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';

	let innerWidth: number = 0;

	let loadedFrame: boolean = false;
	let loadingApp: boolean = false;
	async function loadFrame() {
		loadedFrame = true;
		loadingApp = true;

		// Track this as recently played (apps can count too)
		recentlyPlayed.addGame(data.app.id);

		// Just in case wait 5 seconds before removing the loading screen
		setTimeout(() => {
			loadedApp();
		}, 5000);
	}

	function addView() {
		// Views are now handled by analytics or omitted in static mode
	}

	function loadedApp() {
		// Wait 0.5 second before removing the loading screen
		setTimeout(() => {
			// Remove the hidden class from the iframe
			const iframe: HTMLIFrameElement = document.getElementById('iframe') as HTMLIFrameElement;
			iframe.classList.remove('opacity-0');

			loadingApp = false;
		}, 500);
	}
</script>

<svelte:window bind:innerWidth={innerWidth} />
<svelte:head>
	<meta property="og:title" content="{config.branding.name} - {data.app.title}" />
	<meta
		name="description"
		content="Play {data.app.title} for free now on {config.branding.name}!"
	/>
	<meta
		property="og:description"
		content="Play {data.app.title} for free now on {config.branding.name}!"
	/>

	<script src="/uv/uv.config.js"></script>
	<script src="/uv/uv.bundle.js" defer></script>
	<script src="/uv.js" defer></script>
</svelte:head>

<div class="font-sans min-h-screen bg-base-200 p-4 text-base-content">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail: Navigation -->
		<aside class="hidden h-full lg:block">
			<GameRail games={localizedMockGames} />
		</aside>

		<!-- Main Content: App Player -->
		<main class="flex flex-col gap-6">
			<HeroGameCard
				game={{
					name: data.app.title,
					developer: 'Unknown',
					image: getCDNImageUrl(data.app.image, 'app'),
					views: data.app.views,
					likes: data.app.loves || 0
				}}
				on:play={() => {
					addView();
					loadFrame();
				}}
			>
				<!-- Slot Content: The actual app player logic -->
				<div id="frame" class="relative h-full w-full overflow-hidden rounded-lg bg-black">
					{#if loadingApp}
						<!-- Loading animation -->
						<div
							class="absolute inset-0 z-50 flex h-full w-full items-center justify-center bg-black transition-all"
						>
							<div class="flex flex-col items-center justify-center gap-8">
								<div class="flex flex-col items-center gap-8 sm:flex-row">
									<img src="/logo.png" alt="Loading" class="h-16 w-16 animate-bounce" />
									<h1 class="text-center text-3xl font-bold text-white sm:text-5xl">
										{config.branding.name}
									</h1>
								</div>
								<Icon icon="line-md:loading-alt-loop" class="text-6xl text-white" />
							</div>
						</div>
					{/if}

					<!-- Proxied app -->
					{#if data.app.embedURL != null}
						<iframe
							class="h-full w-full bg-base-100 opacity-0"
							id="iframe"
							title={data.app.title}
							src={encodeURL(data.app.embedURL)}
							on:load={() => loadedApp()}
							allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; clipboard-read; fullscreen"
						/>
					{/if}
				</div>
			</HeroGameCard>

			<!-- Description / Extra Info -->
			<div class="rounded-3xl bg-base-100 p-6 shadow-sm">
				<h2 class="mb-2 text-xl font-black">About {data.app.title}</h2>
				<p class="leading-relaxed text-base-content/80">{data.app.description}</p>
				{#if canShare}
					<button
						class="btn btn-primary mt-4"
						on:click={() => navigator.share({ url: window.location.href })}
					>
						Share App
						<Icon icon="mdi:share-variant" class="text-xl" />
					</button>
				{/if}
			</div>
		</main>

		<!-- Right Column: Ads & Recs -->
		<aside class="flex flex-col gap-6">
			<a
				href="https://joinkaz.com"
				target="_blank"
				class="group flex h-64 w-full flex-col items-center justify-center gap-4 rounded-3xl bg-primary text-center transition-all hover:scale-[1.02] hover:shadow-xl"
			>
				<Icon
					icon="ic:baseline-discord"
					class="text-7xl text-white transition-transform group-hover:scale-110"
				/>
				<div class="flex flex-col gap-1 px-4">
					<span class="text-lg font-bold text-white/90">Join our discord at</span>
					<span class="text-3xl font-black text-white">joinkaz.com</span>
				</div>
			</a>

			<!-- Recommended Apps/Games -->
			<div class="flex flex-col gap-4">
				<h3 class="px-2 text-lg font-black text-white drop-shadow-sm">Recommended</h3>
				<div class="grid grid-cols-2 gap-3">
					{#each localizedMockGames.slice(0, 6) as game}
						<a
							href={game.href}
							class="group relative h-[140px] w-full overflow-hidden rounded-3xl bg-base-100 shadow-sm transition-all hover:scale-105 hover:shadow-lg"
						>
							<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
							<!-- Minimal overlay -->
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
```
