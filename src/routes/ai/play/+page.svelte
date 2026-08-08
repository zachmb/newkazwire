<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import HeroGameCard from '$lib/components/HeroGameCard.svelte';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';

	let gameData: { title: string; code: string } | null = null;
	let codeUrl = '';
	let isPlaying = false;

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	onMount(() => {
		const stored = sessionStorage.getItem('ephemeral_ai_game');
		if (stored) {
			try {
				gameData = JSON.parse(stored);
				if (gameData?.code) {
					const blob = new Blob([gameData.code], { type: 'text/html' });
					codeUrl = URL.createObjectURL(blob);
				}
			} catch (e) {
				console.error('Failed to parse ephemeral game data', e);
			}
		}
	});

	// --- Fullscreen / Expand Logic (matching g/[id] page) ---

	let frameContainer: HTMLDivElement;
	let expanded: boolean = false;

	async function expandiFrame() {
		if (!isPlaying) {
			isPlaying = true;
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
		expanded = false;
	}

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

	// --- Share Modal ---
	let showShareModal = false;
</script>

<svelte:head>
	<title>{gameData?.title || 'Game'} - {config.branding.name}</title>
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
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content: Game Player -->
		<main class="flex flex-col gap-6">
			{#if gameData}
				<HeroGameCard
					game={{
						name: gameData.title,
						developer: 'Kazwire AI',
						image: '/logo.png'
					}}
					id="ai-game-player"
					bind:playing={isPlaying}
					on:play={expandiFrame}
					on:share={() => (showShareModal = true)}
					on:fullscreen={toggleFakeFullscreen}
				>
					<div
						id="frame"
						class="relative h-full w-full overflow-hidden rounded-lg bg-black"
						bind:this={frameContainer}
					>
						<iframe
							src={codeUrl}
							class="h-full w-full"
							title={gameData.title}
							allow="accelerometer; gamepad; gyroscope; camera; microphone; clipboard-write; display-capture; fullscreen"
						/>
					</div>
				</HeroGameCard>

				<!-- Exit Expanded Button -->
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
						on:click={() => (showShareModal = false)}
						on:keydown={(e) => e.key === 'Escape' && (showShareModal = false)}
						role="button"
						tabindex="0"
					>
						<div
							class="w-full max-w-2xl rounded-3xl bg-base-100 p-8 text-center shadow-2xl"
							on:click|stopPropagation
							on:keydown|stopPropagation
							role="dialog"
							aria-modal="true"
							tabindex="-1"
						>
							<h3 class="mb-4 text-2xl font-black text-base-content">Share this AI Game!</h3>
							<p class="mb-6 text-sm opacity-50">
								Note: AI games are session-based and cannot be linked directly.
							</p>
							<button
								class="btn btn-neutral btn-wide rounded-full font-bold"
								on:click={() => (showShareModal = false)}
							>
								Close
							</button>
						</div>
					</div>
				{/if}

				<!-- Info & Attribution -->
				<div class="rounded-3xl bg-base-100 p-6 shadow-sm">
					<div class="flex flex-col justify-between gap-6 md:flex-row md:items-center">
						<div class="flex items-center gap-4">
							<div
								class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
							>
								<Icon icon="mdi:robot" class="text-3xl" />
							</div>
							<div>
								<h2 class="text-xl font-black">{gameData.title}</h2>
								<p class="flex items-center gap-1 text-sm font-bold text-base-content/40">
									Generated by <span class="text-primary">Kazwire AI</span>
								</p>
							</div>
						</div>
						<div class="flex gap-2">
							<a href="/ai" class="btn btn-primary rounded-2xl text-white">
								<Icon icon="mdi:creation" />
								Create Another
							</a>
						</div>
					</div>
				</div>
			{:else}
				<div
					class="flex h-[60vh] flex-col items-center justify-center gap-6 rounded-3xl bg-base-100 text-center shadow-sm"
				>
					<Icon icon="mdi:robot-dead" class="text-9xl opacity-10" />
					<div>
						<h2 class="text-2xl font-black opacity-50">Game Not Found</h2>
						<p class="opacity-40">The ephemeral game data has expired or was not found.</p>
					</div>
					<a href="/ai" class="btn btn-primary rounded-2xl text-white">Return to AI Lab</a>
				</div>
			{/if}
		</main>

		<!-- Right Column: Recs -->
		<aside class="flex flex-col gap-6">
			<!-- Recommended Games -->
			<div class="flex flex-col gap-4">
				<h3 class="px-2 text-lg font-black text-white drop-shadow-sm">Recommended</h3>
				<div class="grid grid-cols-2 gap-3">
					{#each mappedGames.slice(0, 6) as game}
						<a
							href={game.href}
							class="group relative h-[140px] w-full overflow-hidden rounded-3xl bg-base-100 shadow-sm transition-all hover:scale-105 hover:shadow-lg"
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
