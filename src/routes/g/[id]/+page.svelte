<script lang="ts" context="module">
	declare var __uv$config: any;
</script>

<script lang="ts">
	export let data: any;

	import { config } from '$lib/config';
	import { CDN_BASE_URL, getCDNImageUrl } from '$lib/utils/cdn';

	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import HeroGameCard from '$lib/components/HeroGameCard.svelte';
	import GameRail from '$lib/components/GameRail.svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import GameRow from '$lib/components/GameRow.svelte';
	import Icon from '@iconify/svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';
	import { userProfile } from '$lib/stores/userProfile';
	import { games } from '$lib/data/games';
	import { pingStreak } from '$lib/utils/streak';

	$: localizedGames = games.map((g: any) => ({
		...g,
		image: getCDNImageUrl(g.image, 'game')
	}));

	// Related games: prefer shared tags, fall back to filling with others.
	$: related = (() => {
		const currentTags: string[] = data.game.tags || [];
		const others = localizedGames.filter((g: any) => g.href.split('/').pop() !== data.game.id);
		const byTag = others.filter((g: any) => (g.tags || []).some((t: string) => currentTags.includes(t)));
		const seen = new Set<string>();
		const out: any[] = [];
		for (const g of [...byTag, ...others]) {
			if (!seen.has(g.href)) {
				seen.add(g.href);
				out.push(g);
			}
		}
		return out;
	})();

	// Turns a search into a valid URL
	function search(input: string) {
		let template: string = 'https://www.google.com/search?q=%s&hl=en';
		try {
			return new URL(input).toString();
		} catch (err) {}

		try {
			const url: URL = new URL(`http://${input}`);
			if (url.hostname.includes('.')) return url.toString();
		} catch (err) {}
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

		navigator.serviceWorker.getRegistrations().then((registrations) => {
			if (registrations.length === 0) {
				registerServiceWorker();
			}
		});
		return __uv$config.prefix + __uv$config.encodeUrl(search(url));
	}

	function registerServiceWorker() {
		if (typeof __uv$config === 'undefined' || __uv$config.prefix === undefined) {
			console.warn('Service worker config not ready yet');
			setTimeout(registerServiceWorker, 1000);
			return;
		}
		navigator.serviceWorker.register('/uv.js', { scope: __uv$config.prefix }).then((reg) => {
			if (reg.installing) {
				const sw = reg.installing || reg.waiting;
				sw.onstatechange = function () {
					if (sw.state === 'installed') {
						window.location.reload();
					}
				};
			}
		});
	}

	let canShare: boolean = false;
	onMount(() => {
		// Scroll to top when page loads
		window.scrollTo(0, 0);

		registerServiceWorker();
		try {
			if (typeof navigator.canShare === 'function' && navigator.canShare({ url: window.location.href })) {
				canShare = true;
			}
		} catch (e) {
			/* canShare unsupported — non-critical */
		}
		const event = new CustomEvent('rendered', {
			detail: {
				name: 'game',
				id: data.game.id
			}
		});
		window.dispatchEvent(event);
	});

	function fullScreen() {
		const iframe: HTMLIFrameElement = document.getElementById('iframe') as HTMLIFrameElement;
		iframe.requestFullscreen();
	}

	let isPlaying = false;
	let frameContainer: HTMLDivElement;
	let expanded: boolean = false;

	async function expandiFrame() {
		if (!isPlaying) {
			isPlaying = true;
			addView();
			loadFrame();
			await tick();
		}

		if (!frameContainer) return;

		document.body.style.overflow = 'hidden';
		frameContainer.style.position = 'fixed';
		frameContainer.style.top = '0px';
		frameContainer.style.bottom = '0px';
		frameContainer.style.left = '0px';
		frameContainer.style.right = '0px';
		frameContainer.style.height = '100%';
		frameContainer.style.width = '100%';
		frameContainer.style.zIndex = '500';
		frameContainer.style.border = 'none';
		frameContainer.classList.toggle('rounded-t-lg');
		expanded = true;
	}

	function shrinkiFrame() {
		if (!frameContainer) return;

		document.body.style.overflow = 'auto';
		frameContainer.style.position = 'relative';
		frameContainer.style.top = 'auto';
		frameContainer.style.bottom = 'auto';
		frameContainer.style.left = 'auto';
		frameContainer.style.right = 'auto';
		frameContainer.style.height = '100%';
		frameContainer.style.width = '100%';
		frameContainer.style.zIndex = '';
		frameContainer.style.border = 'none';
		frameContainer.classList.toggle('rounded-t-lg');
		expanded = false;
	}

	// Fake Fullscreen (Browser Tab Fullscreen)
	let isFakeFullscreen = false;
	function toggleFakeFullscreen() {
		if (!frameContainer) return;

		isFakeFullscreen = !isFakeFullscreen;

		if (isFakeFullscreen) {
			document.body.style.overflow = 'hidden';
			frameContainer.style.position = 'fixed';
			frameContainer.style.inset = '0';
			frameContainer.style.height = '100vh';
			frameContainer.style.width = '100vw';
			frameContainer.style.zIndex = '9999';
		} else {
			document.body.style.overflow = '';
			frameContainer.style.position = 'relative';
			frameContainer.style.inset = 'auto';
			frameContainer.style.height = '100%';
			frameContainer.style.width = '100%';
			frameContainer.style.zIndex = '';
		}
	}

	let innerWidth: number = 0;
	let loadedFrame: boolean = false;
	let loadingGame: boolean = false;

	// Reset player state when navigating between games
	$: if (data.game.id) {
		loadedFrame = false;
		loadingGame = false;
	}

	async function loadFrame() {
		loadedFrame = true;
		loadingGame = true;

		// Track this game as recently played + count it toward the daily play streak
		recentlyPlayed.addGame(data.game.id);
		userProfile.incrementGamesPlayed();
		pingStreak();

		setTimeout(() => {
			loadedGame();
		}, 5000);
	}

	function addView() {
		// Views are now handled by analytics or omitted in static mode
	}

	function loadedGame() {
		setTimeout(() => {
			const iframe: HTMLIFrameElement = document.getElementById('iframe') as HTMLIFrameElement;
			if (iframe) iframe.classList.remove('opacity-0');
			loadingGame = false;
		}, 500);
	}

	// Keyboard shortcuts: F = fullscreen, Esc = exit, Space/Enter = play
	function onKey(e: KeyboardEvent) {
		const el = e.target as HTMLElement;
		if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
		const k = e.key.toLowerCase();
		if (k === 'f') {
			e.preventDefault();
			if (!isPlaying) expandiFrame();
			else toggleFakeFullscreen();
		} else if (e.key === 'Escape') {
			if (isFakeFullscreen) toggleFakeFullscreen();
			else if (expanded) shrinkiFrame();
		} else if ((k === ' ' || k === 'enter') && !isPlaying) {
			e.preventDefault();
			expandiFrame();
		}
	}

	let showShareModal = false;
	function openShareModal() {
		showShareModal = true;
	}
	function closeShareModal() {
		showShareModal = false;
	}
</script>

<svelte:window bind:innerWidth={innerWidth} on:keydown={onKey} />
<svelte:head>
	<title>{config.branding.name} - {data.game.title}</title>
	<meta property="og:title" content="{config.branding.name} - {data.game.title}" />
	<meta
		name="description"
		content="Play {data.game.title} for free now on {config.branding.name}!"
	/>
	<meta
		property="og:description"
		content="Play {data.game.title} for free now on {config.branding.name}!"
	/>

	<script src="/uv/uv.config.js"></script>
	<script src="/uv/uv.bundle.js" defer></script>
	<script src="/uv.js" defer></script>
</svelte:head>

<div
	class="font-sans relative min-h-screen overflow-hidden bg-base-200 p-4 text-base-content"
>
	<!-- Animated Background Pattern -->
	<div
		class="animated-pattern pointer-events-none absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay"
	/>

	<div
		class="relative z-10 mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]"
	>
		<!-- Left Rail: Navigation -->
		<aside class="hidden h-full lg:block">
			<GameRail games={localizedGames} />
		</aside>

		<!-- Main Content: Game Player -->
		<main class="flex flex-col gap-6">
			<HeroGameCard
				game={{
					name: data.game.title,
					developer: data.game.developer || 'Unknown',
					image: getCDNImageUrl(data.game.image, 'game') || null,
					embedURL: data.game.embedURL || '',
					views: data.game.views || 0
				}}
				id={data.game.id}
				tags={data.game.tags || []}
				bind:playing={isPlaying}
				on:play={expandiFrame}
				on:share={openShareModal}
				on:fullscreen={toggleFakeFullscreen}
			>
				<!-- Slot Content: The actual game player logic -->
				<div
					id="frame"
					class="relative h-full w-full overflow-hidden rounded-lg bg-black"
					bind:this={frameContainer}
				>
					{#if loadingGame}
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

					<!-- Static game -->
					{#if data.game.embedURL == null && data.game.emulatorType == null}
						<iframe
							src={CDN_BASE_URL + '/game/static/' + data.game.id + '/index.html'}
							class="h-full w-full bg-base-100 opacity-0"
							id="iframe"
							title={data.game.title}
							on:load={() => loadedGame()}
							allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; clipboard-read; fullscreen"
						/>
						<!-- Ruffle game -->
					{:else if data.game.emulatorType == 'ruffle'}
						<iframe
							src={'/g/ruffle/' + data.game.id}
							class="h-full w-full bg-base-100 opacity-0"
							id="iframe"
							title={data.game.title}
							on:load={() => loadedGame()}
							allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; clipboard-read; fullscreen"
						/>
						<!-- EmulatorJS game -->
					{:else if data.game.emulatorType == 'emulatorjs'}
						<iframe
							src={'/g/emulator/' + data.game.id}
							class="h-full w-full bg-base-100 opacity-0"
							id="iframe"
							title={data.game.title}
							allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; clipboard-read; fullscreen"
						/>
						<!-- Proxied game -->
					{:else if data.game.embedURL != null}
						<iframe
							class="h-full w-full bg-base-100 opacity-0"
							id="iframe"
							title={data.game.title}
							src={encodeURL(data.game.embedURL)}
							on:load={() => loadedGame()}
							allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; clipboard-read; fullscreen"
						/>
					{/if}
				</div>
			</HeroGameCard>

			<!-- Scroll tease: nudge players down to the rest of the library -->
			{#if !expanded && !isFakeFullscreen}
				<a
					href="#more-games"
					class="group -mt-1 flex items-center justify-center gap-2 text-sm font-bold text-base-content/50 transition hover:text-primary"
				>
					<Icon icon="mdi:gamepad-variant" class="text-lg" />
					<span>{related.length}+ more games below</span>
					<Icon icon="mdi:chevron-double-down" class="animate-bounce text-xl" />
				</a>
			{/if}

			<!-- Exit Fullscreen Button -->
			{#if expanded && !isFakeFullscreen}
				<button
					class="btn btn-circle btn-error fixed left-4 top-4 z-[501] shadow-lg"
					on:click={shrinkiFrame}
					aria-label="Exit Fullscreen"
				>
					<Icon icon="mdi:close" class="h-6 w-6 text-white" />
				</button>
			{/if}

			<!-- Exit Fake Fullscreen Button -->
			{#if isFakeFullscreen}
				<button
					class="btn btn-circle btn-error fixed right-4 top-4 z-[10000] shadow-lg"
					on:click={toggleFakeFullscreen}
					aria-label="Exit Fullscreen"
				>
					<Icon icon="mdi:close" class="h-6 w-6 text-white" />
				</button>
			{/if}

			<!-- Share Modal -->
			{#if showShareModal}
				<div
					class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
					on:click={closeShareModal}
					on:keydown={(e) => e.key === 'Escape' && closeShareModal()}
					role="button"
					tabindex="0"
				>
					<div
						class="w-full max-w-6xl rounded-3xl bg-base-100 p-8 text-center shadow-2xl"
						on:click|stopPropagation
						on:keydown|stopPropagation
						role="dialog"
						aria-modal="true"
						aria-labelledby="share-title"
						tabindex="-1"
					>
						<h3 id="share-title" class="mb-6 text-2xl font-black text-base-content">Share this game!</h3>

						<div class="mb-8 rounded-xl bg-base-100 p-8 md:p-12">
							<a
								href="https://kazwire.com/g/{data.game.id}"
								class="break-all text-5xl font-black tracking-tight text-primary hover:underline md:text-7xl"
								target="_blank"
							>
								kazwire.com/g/{data.game.id}
							</a>
						</div>

						<button
							class="btn btn-neutral btn-wide rounded-full font-bold"
							on:click={closeShareModal}
						>
							Close
						</button>
					</div>
				</div>
			{/if}

			<!-- Description / Extra Info -->
			<div class="rounded-3xl bg-base-100 p-6 shadow-sm">
				<h2 class="mb-2 text-xl font-black">About {data.game.title}</h2>
				<p class="whitespace-pre-line leading-relaxed text-base-content/80">{data.game.description}</p>
				<div class="mt-4 flex flex-wrap gap-2">
					{#each data.game.tags as tag}
						<span class="badge badge-outline badge-lg font-bold text-base-content/60">{tag}</span>
					{/each}
				</div>
			</div>

			<!-- More games like this -->
			<div id="more-games" class="scroll-mt-24">
				<GameRow title="More games like this" icon="mdi:controller" games={related.slice(0, 15)} />
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

			<!-- Recommended Games -->
			<div class="flex flex-col gap-4">
				<h3 class="flex items-center gap-2 px-1 text-lg font-black text-base-content">
					<Icon icon="mdi:thumb-up" class="text-xl text-primary" /> Recommended
				</h3>
				<div class="grid grid-cols-2 gap-3">
					{#each related.slice(0, 6) as game (game.href)}
						<div class="aspect-square">
							<GameCard title={game.title} image={game.image} href={game.href} />
						</div>
					{/each}
				</div>
			</div>
		</aside>
	</div>
</div>

<style>
	@keyframes move-pattern {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 100px 100px;
		}
	}

	.animated-pattern {
		background-image: url('/bg-pattern.png');
		background-size: 800px;
		animation: move-pattern 60s linear infinite;
	}
</style>
