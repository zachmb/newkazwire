<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import HeroGameCard from '$lib/components/HeroGameCard.svelte';

	let game: any = null;
	let isLoading = true;
	let error = '';
	let rating = 0;
	let isSubmittingReview = false;
	let isPlaying = false;

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

	let showShareModal = false;

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	async function fetchGame() {
		try {
			const res = await fetch(`/api/ai/user-g/${$page.params.id}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to fetch game');
			game = data.game;
		} catch (err: any) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function submitReview() {
		if (rating === 0) {
			alert('Please select a rating');
			return;
		}

		isSubmittingReview = true;
		try {
			const res = await fetch(`/api/ai/user-g/${$page.params.id}/review`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating })
			});
			if (!res.ok) throw new Error('Failed to submit review');

			alert('Review submitted! It will appear after the next update.');
			rating = 0;
		} catch (err: any) {
			alert(err.message);
		} finally {
			isSubmittingReview = false;
		}
	}

	onMount(() => {
		window.scrollTo(0, 0);
		fetchGame();
	});
</script>

<svelte:head>
	<title>{game?.title || 'Loading...'} - {config.branding.name}</title>
</svelte:head>

<div class="font-sans min-h-screen bg-[#5B9BFF] p-4 text-neutral">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-6">
			{#if isLoading}
				<div
					class="flex h-96 flex-col items-center justify-center gap-4 rounded-3xl bg-white opacity-50 shadow-xl"
				>
					<Icon icon="line-md:loading-alt-loop" class="text-6xl" />
					<p class="font-bold">Loading game...</p>
				</div>
			{:else if error}
				<div class="alert alert-error rounded-3xl shadow-xl">
					<Icon icon="mdi:alert-circle" class="text-2xl" />
					<div class="flex flex-col">
						<span class="font-bold">Error loading game</span>
						<span>{error}</span>
					</div>
				</div>
			{:else if game}
				<div class="flex flex-col gap-6">
					<!-- Player Card -->
					<HeroGameCard
						game={{
							name: game.title,
							developer: 'Froggy AI',
							image: '/logo.png'
						}}
						id={game.id}
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
								src={game.codeUrl}
								class="h-full w-full"
								title={game.title}
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
								class="w-full max-w-6xl rounded-3xl bg-white p-8 text-center shadow-2xl"
								on:click|stopPropagation
								on:keydown|stopPropagation
								role="dialog"
								aria-modal="true"
								tabindex="-1"
							>
								<h3 class="mb-6 text-2xl font-black text-neutral">Share this game!</h3>
								<div class="mb-8 rounded-xl bg-base-100 p-8 md:p-12">
									<a
										href="https://kazwire.com/ai/user-g/{game.id}"
										class="break-all text-5xl font-black tracking-tight text-primary hover:underline md:text-7xl"
										target="_blank"
									>
										kazwire.com/ai/user-g/{game.id}
									</a>
								</div>
								<button
									class="btn btn-neutral btn-wide rounded-full font-bold"
									on:click={() => (showShareModal = false)}
								>
									Close
								</button>
							</div>
						</div>
					{/if}

					<!-- Game Info & Review -->
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<!-- Info -->
						<div class="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl">
							<div class="flex items-center justify-between">
								<h1 class="text-3xl font-black">{game.title}</h1>
								<div class="flex items-center gap-1 text-xl font-bold text-primary">
									<Icon icon="mdi:star" />
									<span>{game.avgRating || 0}</span>
								</div>
							</div>
							<p class="leading-relaxed text-neutral/70">{game.description}</p>
							<div class="mt-4 flex flex-col gap-2">
								<div class="text-xs font-bold uppercase tracking-wider opacity-40">Created on</div>
								<div class="font-bold">{new Date(game.createdAt).toLocaleDateString()}</div>
							</div>

							<div class="mt-6 flex gap-3">
								<a
									href="/ai?remix={game.id}"
									class="btn btn-primary flex-1 rounded-2xl font-black text-white"
								>
									<Icon icon="mdi:auto-fix" />
									Remix this Game
								</a>
							</div>
						</div>

						<!-- Leave a Review -->
						<div class="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-xl">
							<h3 class="text-2xl font-black">Rate this Game</h3>
							<p class="text-sm opacity-60">Tap a star and submit your rating.</p>

							<div class="flex gap-2 text-3xl">
								{#each [1, 2, 3, 4, 5] as star}
									<button
										class="transition-transform hover:scale-125 {rating >= star
											? 'text-primary'
											: 'text-neutral/10'}"
										on:click={() => (rating = star)}
										aria-label="Rate {star} stars"
									>
										<Icon icon={rating >= star ? 'mdi:star' : 'mdi:star-outline'} />
									</button>
								{/each}
							</div>

							<button
								class="btn btn-neutral rounded-2xl font-black"
								on:click={submitReview}
								disabled={isSubmittingReview}
							>
								{#if isSubmittingReview}
									<Icon icon="line-md:loading-alt-loop" />
								{:else}
									Submit Review
								{/if}
							</button>
						</div>
					</div>
				</div>
			{/if}
		</main>

		<!-- Right Column -->
		<aside class="flex flex-col gap-6">
			<div class="rounded-3xl bg-white p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-black">Pro Tip</h3>
				<p class="text-sm leading-relaxed opacity-70">
					AI games are experimental. If it doesn't work, try remixing it with a better description!
				</p>
			</div>
		</aside>
	</div>
</div>
