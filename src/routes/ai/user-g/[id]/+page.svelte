<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import HeroGameCard from '$lib/components/HeroGameCard.svelte';
	import { pingStreak } from '$lib/utils/streak';
	import CommunityNotes from '$lib/components/social/CommunityNotes.svelte';
	import CommentSection from '$lib/components/social/CommentSection.svelte';

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
		// Always await the render before touching frameContainer: HeroGameCard's
		// bind:playing sets isPlaying before dispatching 'play', so a guarded tick()
		// would be skipped and the fullscreen styling would never apply (game off-screen).
		isPlaying = true;
		pingStreak();
		await tick();
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

	// Lightweight toast (replaces blocking alert() dialogs).
	let toast = '';
	let toastKind: 'success' | 'error' = 'success';
	let toastTimer: ReturnType<typeof setTimeout>;
	function showToast(msg: string, kind: 'success' | 'error' = 'success') {
		toast = msg;
		toastKind = kind;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 3200);
	}

	let showShareModal = false;
	let shareCopied = false;

	function shareLink(): string {
		return `https://kazwire.com/ai/user-g/${game?.id ?? $page.params.id}`;
	}

	async function copyShareLink() {
		try {
			await navigator.clipboard.writeText(shareLink());
			shareCopied = true;
			setTimeout(() => (shareCopied = false), 2000);
		} catch {
			// clipboard blocked — the link is still shown to copy manually
		}
	}

	// Opening Share auto-copies the link (with a "Copied!" confirmation).
	function openShare() {
		showShareModal = true;
		copyShareLink();
	}

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
			showToast('Pick a star rating first', 'error');
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

			showToast('Thanks for reviewing! 🎉');
			rating = 0;
		} catch (err: any) {
			showToast(err.message || 'Something went wrong', 'error');
		} finally {
			isSubmittingReview = false;
		}
	}

	// --- Report broken → regenerate ---
	let isReporting = false;

	async function reportBroken() {
		if (isReporting) return;
		isReporting = true;
		try {
			const res = await fetch(`/api/ai/user-g/${$page.params.id}/report`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			const data = await res.json();

			if (res.status === 429) {
				showToast(data.error || 'This game has hit its regeneration limit for now.', 'error');
				return;
			}
			if (!res.ok || !data?.success) {
				throw new Error(data?.error || 'Could not regenerate the game');
			}

			const remaining = data.remaining ?? 0;
			showToast(`Fixed the game! ${remaining} regeneration${remaining === 1 ? '' : 's'} left`);

			// Reload the fixed build: re-fetch, then cache-bust the iframe src so the
			// browser doesn't serve the old broken bundle.
			await fetchGame();
			if (game?.codeUrl) {
				const sep = game.codeUrl.includes('?') ? '&' : '?';
				// Reassign `game` (not just the property) so the iframe `src` re-renders.
				game = { ...game, codeUrl: `${game.codeUrl}${sep}v=${Date.now()}` };
			}
		} catch (err: any) {
			showToast(err.message || 'Something went wrong', 'error');
		} finally {
			isReporting = false;
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

<div class="font-sans min-h-screen bg-base-200 p-4 text-base-content">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex min-w-0 flex-col gap-6">
			{#if isLoading}
				<div
					class="flex h-96 flex-col items-center justify-center gap-4 rounded-3xl bg-base-100 opacity-50 shadow-xl"
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
							developer: game.creatorName || 'Kazwire AI',
							image: '/logo.png'
						}}
						id={game.id}
						bind:playing={isPlaying}
						on:play={expandiFrame}
						on:share={openShare}
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
								class="w-full max-w-6xl rounded-3xl bg-base-100 p-8 text-center shadow-2xl"
								on:click|stopPropagation
								on:keydown|stopPropagation
								role="dialog"
								aria-modal="true"
								tabindex="-1"
							>
								<h3 class="mb-2 text-2xl font-black text-base-content">Share this game!</h3>
								<p class="mb-6 text-sm opacity-60">
									{#if shareCopied}<span class="font-bold text-success">Link copied to your clipboard ✓</span>{:else}Link copied — or copy it again below.{/if}
								</p>
								<div class="mb-6 flex items-center gap-2 rounded-xl bg-neutral/5 p-3">
									<input
										readonly
										value={shareLink()}
										class="input input-ghost w-full flex-1 truncate font-mono text-sm"
										on:focus={(e) => e.currentTarget.select()}
									/>
									<button class="btn btn-primary font-bold text-white" on:click={copyShareLink}>
										<Icon icon={shareCopied ? 'mdi:check' : 'mdi:content-copy'} />
										{shareCopied ? 'Copied!' : 'Copy link'}
									</button>
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
						<div class="flex flex-col gap-4 rounded-3xl bg-base-100 p-8 shadow-xl">
							<div class="flex items-center justify-between">
								<h1 class="text-3xl font-black">{game.title}</h1>
								<div class="flex items-center gap-1 text-xl font-bold text-primary">
									<Icon icon="mdi:star" />
									<span>{game.avgRating || 0}</span>
								</div>
							</div>
							<p class="leading-relaxed text-base-content/70">{game.description}</p>
							<div class="mt-4 flex flex-wrap gap-8">
								<div class="flex flex-col gap-1">
									<div class="text-xs font-bold uppercase tracking-wider opacity-40">Created by</div>
									<div class="flex items-center gap-1.5 font-bold">
										<Icon icon="mdi:account-circle" class="text-primary" />
										{game.creatorName || 'Anonymous'}{#if game.creatorLocation}<span class="opacity-50">· {game.creatorLocation}</span>{/if}
									</div>
								</div>
								<div class="flex flex-col gap-1">
									<div class="text-xs font-bold uppercase tracking-wider opacity-40">Created on</div>
									<div class="font-bold">{new Date(game.createdAt).toLocaleDateString()}</div>
								</div>
							</div>

							<div class="mt-6 flex flex-wrap gap-3">
								<a
									href="/ai?remix={game.id}"
									class="btn btn-primary gap-2 whitespace-nowrap rounded-2xl font-black text-white"
								>
									<Icon icon="mdi:auto-fix" />
									Remix this Game
								</a>
								<button
									class="btn btn-outline rounded-2xl font-black"
									on:click={reportBroken}
									disabled={isReporting}
								>
									{#if isReporting}
										<Icon icon="line-md:loading-alt-loop" />
										Regenerating…
									{:else}
										<Icon icon="mdi:wrench-outline" />
										Report broken
									{/if}
								</button>
							</div>
						</div>

						<!-- Leave a Review -->
						<div class="flex flex-col gap-4 rounded-3xl bg-base-100 p-8 shadow-xl">
							<h3 class="text-2xl font-black">Rate this Game</h3>
							<p class="text-sm opacity-60">Tap a star and submit your rating.</p>

							<div class="flex gap-2 text-3xl">
								{#each [1, 2, 3, 4, 5] as star}
									<button
										class="transition-transform hover:scale-125 {rating >= star
											? 'text-primary'
											: 'text-base-content/10'}"
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

					<!-- Community context + discussion -->
					<CommunityNotes gameId={game.id} />
					<CommentSection gameId={game.id} />
				</div>
			{/if}
		</main>

		<!-- Toast -->
		{#if toast}
			<div class="pointer-events-none fixed inset-x-0 bottom-6 z-[2000] flex justify-center px-4">
				<div
					class="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl {toastKind ===
					'success'
						? 'bg-primary'
						: 'bg-error'}"
					role="status"
				>
					<Icon icon={toastKind === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} class="text-lg" />
					{toast}
				</div>
			</div>
		{/if}

		<!-- Right Column -->
		<aside class="flex flex-col gap-6">
			<div class="rounded-3xl bg-base-100 p-6 shadow-xl">
				<h3 class="mb-4 text-xl font-black">Pro Tip</h3>
				<p class="text-sm leading-relaxed opacity-70">
					AI games are experimental. If it doesn't work, try remixing it with a better description!
				</p>
			</div>
		</aside>
	</div>
</div>
