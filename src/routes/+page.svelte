<script lang="ts">
	import { config } from '$lib/config';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import { userProfile } from '$lib/stores/userProfile';
	import GameGrid from '$lib/components/GameGrid.svelte';
	import GameCard from '$lib/components/GameCard.svelte';
	import Icon from '@iconify/svelte';

	let aiGames: any[] = [];
	let aiGamesLoading = true;

	const featuredGame = (config as any).featuredGame;

	export let data: any;
	$: games = data.games.map((g: any) => ({
		...g,
		title: g.title || 'Untitled',
		image: getCDNImageUrl(g.image, 'game'),
		href: g.href
	}));

	let showPopupAd = false;
	let showStickyAd = true;

	import { onMount } from 'svelte';

	onMount(async () => {
		try {
			const res = await fetch('/api/ai/gallery');
			const data = await res.json();
			if (res.ok) aiGames = (data.games || []).slice(0, 8);
		} catch {
			// silently fail — AI section is non-critical
		} finally {
			aiGamesLoading = false;
		}
	});

	// Reactive check to hide ads immediately if toggled off
	$: if (!$userProfile.showAds) {
		showPopupAd = false;
		showStickyAd = false;
	} else {
		// If toggled on, show sticky ad (popup handles itself via timeout/close)
		showStickyAd = true;
	}
</script>

<svelte:head>
	<title>{config.branding.name}</title>
	<meta property="og:title" content={config.branding.name} />
	<meta name="description" content={config.branding.description} />
	<meta property="og:description" content={config.branding.description} />
</svelte:head>

<div
	class="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#5B9BFF] via-[#3B82F6] to-[#2563EB] p-4 text-neutral"
>
	<!-- Animated Background Pattern & Coral Highlights -->
	<div class="pointer-events-none absolute inset-0 z-0 overflow-hidden">
		<!-- Moving pattern overlay -->
		<div class="animated-pattern absolute inset-0 opacity-[0.07] mix-blend-overlay" />

		<!-- Coral accents / Dart frog vibes -->
		<div
			class="absolute -left-20 top-20 h-96 w-96 rounded-full bg-[#FF6A1A] opacity-20 blur-[100px]"
		/>
		<div
			class="absolute -right-20 bottom-40 h-80 w-80 rounded-full bg-[#FF9F1C] opacity-20 blur-[100px]"
		/>
		<div
			class="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF3D2E] opacity-10 blur-[120px]"
		/>
	</div>

	<div class="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-12">
		<GameGrid games={games} />

		<!-- AI Community Games Section -->
		{#if aiGamesLoading}
			<section class="flex flex-col gap-4">
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
						<Icon icon="mdi:robot" class="text-2xl text-accent" />
					</div>
					<h2 class="text-2xl font-black text-white drop-shadow-sm">AI Community Games</h2>
					<div class="loading loading-dots loading-sm text-white opacity-60" />
				</div>
			</section>
		{:else if aiGames.length > 0}
			<section class="flex flex-col gap-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/30">
							<Icon icon="mdi:robot" class="text-2xl text-white" />
						</div>
						<h2 class="text-2xl font-black text-white drop-shadow-sm">AI Community Games</h2>
					</div>
					<a
						href="/ai/gallery"
						class="btn btn-sm rounded-full bg-white/20 font-bold text-white backdrop-blur-sm hover:bg-white/30"
					>
						See All <Icon icon="mdi:arrow-right" />
					</a>
				</div>
				<div
					class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
				>
					{#each aiGames as game (game.id)}
						<a
							href="/ai/user-g/{game.id}"
							class="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 shadow-lg backdrop-blur-sm transition-all hover:scale-[1.04] hover:shadow-xl"
						>
							<div
								class="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center"
							>
								<Icon
									icon="mdi:robot"
									class="text-4xl text-white/60 transition-transform group-hover:scale-110"
								/>
								<span class="line-clamp-2 text-xs font-black text-white drop-shadow"
									>{game.title}</span
								>
							</div>
							<div
								class="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-black/40 px-2 py-0.5 text-xs font-bold text-yellow-300"
							>
								<Icon icon="mdi:star" class="text-xs" />{game.avgRating || 'New'}
							</div>
							{#if game.sourceGameId}
								<div class="badge badge-accent absolute left-2 top-2 text-xs font-bold">REMIX</div>
							{/if}
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Favorites Section (Conditional) -->
		{#if $userProfile.favoriteGames.length > 0}
			<section class="flex flex-col gap-6">
				<div class="flex items-center gap-2">
					<Icon icon="mdi:heart" class="text-3xl text-red-500" />
					<h2 class="px-2 text-3xl font-black text-white drop-shadow-sm">Your Favorites</h2>
				</div>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
					{#each games.filter((g: any) => {
						const id = g.href.split('/').pop() || '';
						return $userProfile.favoriteGames.includes(id) && id !== featuredGame;
					}) as game}
						<div class="aspect-[3/4]">
							<GameCard
								title={game.title || 'Untitled'}
								image={game.image || ''}
								href={game.href}
							/>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

<!-- Popup Ad Modal (Placeholder) -->
{#if showPopupAd}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
		<div
			class="animate-bounce-in relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl"
		>
			<button
				class="btn btn-circle btn-ghost btn-sm absolute right-4 top-4"
				on:click={() => (showPopupAd = false)}
			>
				<Icon icon="mdi:close" class="text-2xl" />
			</button>

			<div class="flex flex-col items-center gap-4 text-center">
				<h3 class="text-2xl font-black text-neutral">Check this out!</h3>
				<div
					class="flex h-64 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-100"
				>
					<span class="font-bold text-gray-400">Ad Space Placeholder</span>
				</div>
				<button
					class="btn btn-primary btn-wide rounded-full font-black text-white shadow-lg shadow-primary/30"
				>
					Learn More
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Sticky Bottom Ad (Placeholder) -->
{#if showStickyAd}
	<div class="fixed bottom-4 left-1/2 z-40 w-full max-w-3xl -translate-x-1/2 px-4">
		<div
			class="relative flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-xl"
		>
			<div class="flex items-center gap-4">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-400"
				>
					Ad
				</div>
				<div class="flex flex-col">
					<span class="font-bold text-neutral">Special Offer</span>
					<span class="text-sm text-neutral/60">Get 50% off Kazwire Coins today!</span>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<button class="btn btn-primary btn-sm rounded-full text-white">View</button>
				<button
					class="btn btn-circle btn-ghost btn-sm text-neutral/50"
					on:click={() => (showStickyAd = false)}
				>
					<Icon icon="mdi:close" />
				</button>
			</div>
		</div>
	</div>
{/if}

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
		background-size: 300px;
		animation: move-pattern 30s linear infinite;
	}
</style>
