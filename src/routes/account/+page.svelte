<script lang="ts">
	// @ts-nocheck
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
	import GameRail from '$lib/components/GameRail.svelte';
	import { userProfile } from '$lib/stores/userProfile';
	import { recentlyPlayed } from '$lib/stores/recentlyPlayed';
	import { localAiGames } from '$lib/stores/localAiGames';
	import { games } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getUid, getPlayerName, setPlayerName } from '$lib/utils/streak';
	import ItemShop from '$lib/components/ItemShop.svelte';
	import PlayerSearch from '$lib/components/PlayerSearch.svelte';

	// ── Real identity (server-keyed, account-free) ──
	let uid = '';
	let displayName = 'Anonymous';

	// ── Real stats (populated onMount from the streak + profile endpoints) ──
	let statsLoading = true;
	let currentStreak = 0;
	let longestStreak = 0;
	let gamesPlayed = 0;
	let gamesCreated = 0;
	let postsCount = 0;
	let commentsCount = 0;

	let isEditingUsername = false;
	let newUsername = '';
	let recentGamesList = [];
	let activeTab = 'profile';
	let walletCoins = 0; // real server Kazcoin balance (earned by playing)

	onMount(async () => {
		uid = getUid();
		displayName = getPlayerName();
		newUsername = displayName === 'Anonymous' ? '' : displayName;
		if (!uid) {
			statsLoading = false;
			return;
		}

		// Real Kazcoin wallet balance (server-authoritative).
		try {
			const res = await fetch(`/api/wallet?uid=${encodeURIComponent(uid)}`);
			if (res.ok) { const d = await res.json(); if (d?.success) walletCoins = d.coins ?? 0; }
		} catch { /* offline */ }

		// Streak stats: current + longest streak + total games played.
		try {
			const res = await fetch(`/api/streak?uid=${encodeURIComponent(uid)}`);
			if (res.ok) {
				const data = await res.json();
				if (data?.success) {
					currentStreak = data.streak ?? 0;
					longestStreak = data.longest ?? 0;
					gamesPlayed = data.gamesPlayed ?? 0;
				}
			}
		} catch {
			/* offline — leave zeros */
		}

		// Profile aggregate: games created, posts, comments. 404 for a brand-new user.
		try {
			const res = await fetch(`/api/profile/${encodeURIComponent(uid)}`);
			if (res.ok) {
				const data = await res.json();
				const p = data?.profile;
				if (p) {
					gamesCreated = p.gamesCreated ?? 0;
					postsCount = p.postsCount ?? 0;
					commentsCount = p.commentsCount ?? 0;
					// Prefer the server's streak-derived counts if they're higher (fresh source).
					gamesPlayed = Math.max(gamesPlayed, p.gamesPlayed ?? 0);
					currentStreak = Math.max(currentStreak, p.streak ?? 0);
					longestStreak = Math.max(longestStreak, p.longestStreak ?? 0);
					// Adopt the server-stored name only if this browser has none set yet.
					if (p.name && getPlayerName() === 'Anonymous') displayName = p.name;
				}
			}
			// A 404 is expected for a user with no created content — zeros stand.
		} catch {
			/* offline — leave zeros */
		}

		statsLoading = false;

		// Real leaderboard — top players by current streak.
		try {
			const res = await fetch('/api/leaderboard');
			if (res.ok) {
				const data = await res.json();
				if (data?.success && Array.isArray(data.leaders)) leaders = data.leaders;
			}
		} catch {
			/* offline — leave empty */
		}
		leaderboardLoading = false;
	});

	// ── Real leaderboard (top players by streak) ──
	let leaders = [];
	let leaderboardLoading = true;

	let publishingIds = new Set();
	let successfullyPublishedIds = new Set();
	let publishError = '';

	const TABS = [
		{ id: 'profile',     label: 'Profile',     icon: 'mdi:account' },
		{ id: 'ai-games',    label: 'AI Games',    icon: 'mdi:robot' },
		{ id: 'shop',        label: 'Shop',        icon: 'mdi:store' },
		{ id: 'players',     label: 'Players',     icon: 'mdi:account-search' },
		{ id: 'leaderboard', label: 'Leaderboard', icon: 'mdi:trophy' }
	];

	function playLocalGame(game) {
		sessionStorage.setItem('ephemeral_ai_game', JSON.stringify({ title: game.title, code: game.code }));
		window.location.href = '/ai/play';
	}

	async function handlePublish(game) {
		if (publishingIds.has(game.id)) return;
		publishError = '';
		publishingIds.add(game.id);
		publishingIds = new Set(publishingIds);
		try {
			const response = await fetch('/api/ai/user-g', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: game.title, description: game.description || '', code: game.code })
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Failed to publish');
			successfullyPublishedIds.add(game.id);
			successfullyPublishedIds = new Set(successfullyPublishedIds);
			const destination = data.publicPath || `/ai/user-g/${data.gameId}`;
			await goto(destination);
			if (window.location.pathname !== destination) window.location.assign(data.publicUrl || destination);
		} catch (err) {
			publishError = err.message;
		} finally {
			publishingIds.delete(game.id);
			publishingIds = new Set(publishingIds);
		}
	}

	function saveUsername() {
		setPlayerName(newUsername);
		displayName = getPlayerName();
		// Mirror into the local profile store so other UI (leaderboard row) stays in sync.
		userProfile.updateUsername(displayName);
		isEditingUsername = false;
	}

	function startEditing() {
		newUsername = displayName === 'Anonymous' ? '' : displayName;
		isEditingUsername = true;
	}

	$: mappedGames = games.map((g) => ({ ...g, image: getCDNImageUrl(g.image) }));

	$: {
		const recentIds = $recentlyPlayed.map((g) => g.id);
		recentGamesList = recentIds
			.map((id) => mappedGames.find((g) => g.href.endsWith(`/${id}`)))
			.filter((g) => !!g);
	}

	$: xpInLevel = ($userProfile.xp ?? 0) % 100;

	// Real client-store counts.
	$: favoritesCount = ($userProfile.favoriteGames ?? []).length;
	$: aiGamesCount = $localAiGames.length;
	$: recentlyPlayedCount = recentGamesList.length;
</script>

<svelte:head>
	<title>{config.branding.name} - Account</title>
</svelte:head>

<div class="min-h-screen bg-base-200 p-4">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">

		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-4">

			<!-- ── HERO BANNER ── -->
			<div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2563EB] to-[#2563EB] shadow-xl">
				<!-- Decorative blobs -->
				<div class="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#FF6A1A] opacity-25 blur-3xl"></div>
				<div class="pointer-events-none absolute -bottom-6 left-1/4 h-32 w-32 rounded-full bg-accent opacity-20 blur-2xl"></div>
				<div class="pointer-events-none absolute right-1/4 top-0 h-40 w-40 rounded-full bg-[#FF3D2E] opacity-10 blur-3xl"></div>

				<div class="relative px-8 pb-8 pt-8">
					<!-- Top row: avatar + name + coins -->
					<div class="flex flex-col gap-6 sm:flex-row sm:items-center">

						<!-- Avatar -->
						<div class="relative shrink-0">
							<div class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-accent/50 bg-white/20 shadow-xl ring-4 ring-white/10 backdrop-blur-sm">
								<Icon icon="mdi:account-circle" class="h-full w-full text-white/60" />
							</div>
							<span class="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-3 py-0.5 text-xs font-black text-base-content shadow-lg">
								LVL {$userProfile.level}
							</span>
						</div>

						<!-- Name -->
						<div class="flex-1">
							{#if isEditingUsername}
								<div class="flex flex-wrap items-center gap-2">
									<input
										type="text"
										class="input input-bordered w-full max-w-xs bg-base-100 font-black text-base-content"
										bind:value={newUsername}
										on:keydown={(e) => e.key === 'Enter' && saveUsername()}
									/>
									<button class="btn btn-accent btn-sm font-black" on:click={saveUsername}>Save</button>
									<button class="btn btn-ghost btn-sm text-white" on:click={() => (isEditingUsername = false)}>Cancel</button>
								</div>
							{:else}
								<div class="group flex items-center gap-2">
									<h1 class="text-4xl font-black text-white drop-shadow">{displayName}</h1>
									<button
										class="rounded-full p-1.5 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
										on:click={startEditing}
										aria-label="Edit display name"
									><Icon icon="mdi:pencil" class="text-white" /></button>
								</div>
							{/if}
							<div class="mt-1 flex flex-wrap items-center gap-3">
								<p class="text-sm font-semibold text-white/60">Joined {$userProfile.joinDate}</p>
								{#if uid}
									<a
										href="/u/{uid}"
										class="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white transition-colors hover:bg-white/25"
									>
										<Icon icon="mdi:open-in-new" class="text-sm" />View public profile
									</a>
								{/if}
							</div>
						</div>

						<!-- Coins -->
						<div class="flex shrink-0 items-center gap-3 rounded-2xl bg-black/20 px-5 py-3 backdrop-blur-sm">
							<Icon icon="mdi:currency-usd-circle" class="text-3xl text-yellow-300" />
							<div>
								<div class="text-2xl font-black leading-none text-white">{walletCoins.toLocaleString()}</div>
								<div class="text-xs font-bold text-white/50">Coins</div>
							</div>
						</div>
					</div>

					<!-- XP bar -->
					<div class="mt-6">
						<div class="mb-1.5 flex justify-between text-xs font-bold text-white/60">
							<span>{xpInLevel} / 100 XP · Level {$userProfile.level}</span>
							<span>Level {$userProfile.level + 1} →</span>
						</div>
						<div class="h-3 w-full overflow-hidden rounded-full bg-black/20">
							<div
								class="h-full rounded-full bg-gradient-to-r from-accent to-yellow-300 shadow-sm transition-all duration-500"
								style="width: {xpInLevel}%"
							></div>
						</div>
					</div>
				</div>

				<!-- Stat strip — inside the banner, darker bottom. Every value is real. -->
				<div class="grid grid-cols-2 border-t border-white/10 sm:grid-cols-4 lg:grid-cols-8">
					{#each [
						{ icon: 'mdi:fire',            value: currentStreak,      label: 'Day Streak',    color: 'text-orange-300' },
						{ icon: 'mdi:fire-circle',     value: longestStreak,      label: 'Longest Streak',color: 'text-amber-300'  },
						{ icon: 'mdi:gamepad-variant', value: gamesPlayed,        label: 'Games Played',  color: 'text-sky-300'    },
						{ icon: 'mdi:heart',           value: favoritesCount,     label: 'Favorites',     color: 'text-pink-300'   },
						{ icon: 'mdi:robot',           value: aiGamesCount,        label: 'AI Games',      color: 'text-violet-300' },
						{ icon: 'mdi:puzzle',          value: gamesCreated,       label: 'Created',       color: 'text-emerald-300'},
						{ icon: 'mdi:message-text',    value: postsCount,         label: 'Posts',         color: 'text-cyan-300'   },
						{ icon: 'mdi:comment-multiple',value: commentsCount,      label: 'Comments',      color: 'text-indigo-300' }
					] as stat}
						<div class="flex items-center gap-3 border-t border-white/5 bg-black/15 px-5 py-4">
							<Icon icon={stat.icon} class="shrink-0 text-2xl {stat.color}" />
							<div>
								<div class="text-xl font-black text-white">
									{#if statsLoading}
										<span class="inline-block h-5 w-6 animate-pulse rounded bg-white/20"></span>
									{:else}
										{stat.value}
									{/if}
								</div>
								<div class="text-xs font-semibold text-white/50">{stat.label}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- ── TAB BAR ── -->
			<div class="flex gap-2 rounded-2xl bg-black/15 p-1.5 backdrop-blur-sm">
				{#each TABS as tab}
					<button
						class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all duration-150
							{activeTab === tab.id
								? 'bg-base-100 text-primary shadow-md'
								: 'text-white/70 hover:bg-white/10 hover:text-white'}"
						on:click={() => { activeTab = tab.id; }}
					>
						<Icon icon={tab.icon} class="text-base shrink-0" />
						<span class="hidden sm:inline">{tab.label}</span>
					</button>
				{/each}
			</div>

			<!-- ── TAB CONTENT ── -->

			<!-- PROFILE -->
			{#if activeTab === 'profile'}
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">

					<!-- Recently Played -->
					{#if recentGamesList.length > 0}
						<div class="col-span-full rounded-3xl bg-base-100 p-6 shadow-lg">
							<h2 class="mb-4 flex items-center gap-2 text-lg font-black text-base-content">
								<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Icon icon="mdi:history" class="text-primary" /></span>
								Recently Played
								<span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary">{recentlyPlayedCount}</span>
							</h2>
							<div class="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8">
								{#each recentGamesList.slice(0, 8) as game}
									<a
										href={game.href}
										class="group relative aspect-square overflow-hidden rounded-2xl bg-base-200 shadow-sm transition-all hover:scale-105 hover:shadow-md"
									>
										<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
										<div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
										<div class="absolute inset-x-0 bottom-0 translate-y-full p-1.5 transition-transform group-hover:translate-y-0">
											<span class="block truncate text-[10px] font-black text-white">{game.title}</span>
										</div>
									</a>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Settings -->
					<div class="rounded-3xl bg-base-100 p-6 shadow-lg">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-black text-base-content">
							<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15"><Icon icon="mdi:cog" class="text-amber-600" /></span>
							Settings
						</h2>
						<div class="flex flex-col gap-1">
							<label class="flex cursor-pointer items-center justify-between rounded-2xl p-3 transition-colors hover:bg-base-100">
								<div class="flex items-center gap-3">
									<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
										<Icon icon="mdi:advertisements" class="text-primary" />
									</div>
									<div>
										<div class="font-bold text-base-content">Support Ads</div>
										<div class="text-xs text-base-content/40">Help support the developer</div>
									</div>
								</div>
								<input type="checkbox" class="toggle toggle-success" checked={$userProfile.showAds}
									on:change={() => userProfile.update((p) => ({ ...p, showAds: !p.showAds }))} />
							</label>
							<label class="flex cursor-pointer items-center justify-between rounded-2xl p-3 transition-colors hover:bg-base-100">
								<div class="flex items-center gap-3">
									<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
										<Icon icon="mdi:theme-light-dark" class="text-amber-500" />
									</div>
									<div>
										<div class="font-bold text-base-content">Dark Mode</div>
										<div class="text-xs text-base-content/40">Toggle dark theme</div>
									</div>
								</div>
								<input type="checkbox" class="toggle toggle-success" checked />
							</label>
							<label class="flex cursor-pointer items-center justify-between rounded-2xl p-3 transition-colors hover:bg-base-100">
								<div class="flex items-center gap-3">
									<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10">
										<Icon icon="mdi:volume-high" class="text-secondary" />
									</div>
									<div>
										<div class="font-bold text-base-content">Sound Effects</div>
										<div class="text-xs text-base-content/40">Enable or disable UI sounds</div>
									</div>
								</div>
								<input type="checkbox" class="toggle toggle-success" checked />
							</label>
						</div>
					</div>

					<!-- Favorites -->
					<div class="rounded-3xl bg-base-100 p-6 shadow-lg">
						<h2 class="mb-4 flex items-center gap-2 text-lg font-black text-base-content">
							<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50"><Icon icon="mdi:heart" class="text-red-400" /></span>
							Favorite Games
							<span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-black text-red-400">{favoritesCount}</span>
						</h2>
						{#if $userProfile.favoriteGames.length === 0}
							<div class="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl bg-base-100 text-center">
								<Icon icon="mdi:heart-outline" class="text-3xl text-base-content/20" />
								<p class="text-sm font-bold text-base-content/30">No favorites yet — heart a game to save it.</p>
							</div>
						{:else}
							<div class="grid grid-cols-4 gap-2">
								{#each mappedGames.filter(g => $userProfile.favoriteGames.includes(g.href.split('/').pop())).slice(0, 8) as game}
									<a href={game.href} class="group relative aspect-square overflow-hidden rounded-xl transition-all hover:scale-105 hover:shadow-md">
										<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
									</a>
								{/each}
							</div>
						{/if}
					</div>
				</div>

			<!-- AI GAMES -->
			{:else if activeTab === 'ai-games'}
				<div class="flex flex-col gap-4">
					<!-- CTA -->
					<div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-secondary p-7 text-white shadow-lg">
						<div class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
						<div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 class="text-2xl font-black">Kazwire AI Lab</h2>
								<p class="mt-1 opacity-80">Turn your ideas into playable games instantly.</p>
							</div>
							<a href="/ai" class="btn shrink-0 rounded-2xl bg-base-100 font-black text-primary shadow-md hover:bg-white/90">
								<Icon icon="mdi:auto-fix" />Generate a Game
							</a>
						</div>
					</div>

					<!-- Games grid -->
					<div class="rounded-3xl bg-base-100 p-6 shadow-lg">
						<div class="mb-5 flex items-center justify-between">
							<h3 class="flex items-center gap-2 text-lg font-black text-base-content">
								<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/10"><Icon icon="mdi:robot" class="text-secondary" /></span>
								My AI Games
							</h3>
							<span class="rounded-full bg-secondary/10 px-3 py-1 text-xs font-black text-secondary">{$localAiGames.length} saved</span>
						</div>

						{#if $localAiGames.length === 0}
							<div class="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl bg-base-100 text-center">
								<Icon icon="mdi:robot-outline" class="text-5xl text-base-content/15" />
								<p class="text-sm font-bold text-base-content/30">No AI games yet.</p>
								<a href="/ai" class="btn btn-primary btn-sm rounded-full font-black text-white">Generate one now</a>
							</div>
						{:else}
							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{#each $localAiGames as game}
									<div class="group flex flex-col gap-2 rounded-2xl border-l-4 border-primary/40 bg-base-100 p-4 transition-all hover:shadow-md">
										<div class="flex items-start justify-between gap-2">
											<div class="min-w-0 flex-1">
												<div class="truncate font-black text-base-content">{game.title}</div>
												<div class="mt-0.5 text-xs text-base-content/40">{new Date(game.createdAt).toLocaleDateString()}</div>
											</div>
											<div class="flex shrink-0 gap-1.5">
												{#if successfullyPublishedIds.has(game.id)}
													<span class="badge badge-success gap-1 font-bold text-white"><Icon icon="mdi:check-circle" />Published</span>
												{:else}
													<button class="btn btn-accent btn-sm rounded-xl font-bold"
														on:click|preventDefault={() => handlePublish(game)}
														disabled={publishingIds.has(game.id)}>
														{#if publishingIds.has(game.id)}
															<span class="loading loading-spinner loading-xs"></span>
														{:else}
															<Icon icon="mdi:cloud-upload" />Publish
														{/if}
													</button>
												{/if}
												<button class="btn btn-primary btn-sm rounded-xl text-white" on:click={() => playLocalGame(game)}>
													<Icon icon="mdi:play" />
												</button>
												<button class="btn btn-ghost btn-sm rounded-xl text-error opacity-0 transition-opacity group-hover:opacity-100"
													on:click={() => localAiGames.deleteGame(game.id)}>
													<Icon icon="mdi:trash-can-outline" />
												</button>
											</div>
										</div>
										{#if game.description}
											<p class="line-clamp-2 text-sm text-base-content/50">{game.description}</p>
										{/if}
										{#if publishError && publishingIds.has(game.id)}
											<p class="text-xs font-bold text-error">{publishError}</p>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

			<!-- SHOP -->
			{:else if activeTab === 'shop'}
				<div class="rounded-3xl bg-base-100 p-6 shadow-lg">
					<ItemShop />
				</div>

			{:else if activeTab === 'players'}
				<div class="rounded-3xl bg-base-100 p-6 shadow-lg">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-black text-base-content">
						<span class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"><Icon icon="mdi:account-search" class="text-primary" /></span>
						Find players
					</h2>
					<PlayerSearch />
				</div>

			<!-- LEADERBOARD -->
			{:else if activeTab === 'leaderboard'}
				<div class="flex flex-col gap-4">
					<!-- Banner -->
					<div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yellow-400 to-orange-500 p-7 text-white shadow-lg">
						<div class="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
						<div class="relative flex items-center justify-between">
							<div>
								<h3 class="text-2xl font-black">Top Streaks</h3>
								<p class="mt-1 font-semibold opacity-80">The players with the longest daily-play streaks. Play every day to climb.</p>
							</div>
							<Icon icon="mdi:trophy" class="text-6xl text-yellow-200 drop-shadow-lg" />
						</div>
					</div>

					<!-- Table -->
					<div class="overflow-hidden rounded-3xl bg-base-100 shadow-lg">
						{#if leaderboardLoading}
							<div class="flex h-40 items-center justify-center">
								<span class="loading loading-spinner loading-lg text-primary"></span>
							</div>
						{:else if leaders.length === 0}
							<div class="flex h-48 flex-col items-center justify-center gap-3 text-center">
								<Icon icon="mdi:trophy-outline" class="text-5xl text-base-content/15" />
								<p class="text-sm font-bold text-base-content/40">No ranked players yet — play a game today to start a streak and claim a spot.</p>
							</div>
						{:else}
							<table class="table w-full">
								<thead>
									<tr class="bg-neutral/5 text-xs font-black uppercase tracking-wider text-base-content/40">
										<th class="w-14 py-4">Rank</th>
										<th class="py-4">Player</th>
										<th class="py-4 text-right">Streak</th>
										<th class="py-4 text-right">Longest</th>
										<th class="py-4 text-right">Played</th>
									</tr>
								</thead>
								<tbody>
									{#each leaders as player, i}
										{@const rank = i + 1}
										{@const isUser = displayName !== 'Anonymous' && player.name === displayName}
										<tr class="border-t border-neutral/8 transition-colors {isUser ? 'bg-primary/5' : 'hover:bg-base-200'}">
											<td class="py-4 font-black">
												{#if rank === 1}<Icon icon="mdi:medal" class="text-2xl text-yellow-400" />
												{:else if rank === 2}<Icon icon="mdi:medal" class="text-2xl text-slate-400" />
												{:else if rank === 3}<Icon icon="mdi:medal" class="text-2xl text-orange-400" />
												{:else}<span class="text-base-content/30">#{rank}</span>{/if}
											</td>
											<td class="py-4">
												<div class="flex items-center gap-3">
													<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black
														{isUser ? 'bg-primary text-white' : 'bg-neutral/10 text-base-content/50'}">
														{(player.name || '??').substring(0, 2).toUpperCase()}
													</div>
													<span class="font-bold {isUser ? 'text-primary' : 'text-base-content'}">{player.name || 'Anonymous'}</span>
													{#if isUser}<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary">You</span>{/if}
												</div>
											</td>
											<td class="py-4 text-right font-mono font-bold text-orange-500">{player.streak}</td>
											<td class="py-4 text-right font-mono font-bold text-base-content/60">{player.longest}</td>
											<td class="py-4 text-right font-mono font-bold text-base-content/60">{player.gamesPlayed}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Back home -->
			<div>
				<a href="/" class="btn rounded-2xl bg-black/15 font-black text-white backdrop-blur-sm hover:bg-black/25">
					<Icon icon="mdi:arrow-left" />Back to Games
				</a>
			</div>
		</main>

		<!-- Right Sidebar -->
		<aside class="flex flex-col gap-4">
			<div class="flex h-56 w-full items-center justify-center rounded-3xl border-2 border-dashed border-white/20 bg-white/10">
				<span class="text-sm font-bold text-white/30">Ad Space</span>
			</div>
			<div class="rounded-3xl bg-white/10 p-4">
				<h3 class="mb-3 text-xs font-black uppercase tracking-widest text-white/60">Recommended</h3>
				<div class="grid grid-cols-2 gap-3">
					{#each mappedGames.slice(0, 6) as game}
						<a href={game.href} class="group relative aspect-square overflow-hidden rounded-2xl bg-base-100 shadow-sm transition-all hover:scale-105 hover:shadow-md">
							<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
							<div class="absolute inset-x-0 bottom-0 translate-y-full p-1.5 transition-transform group-hover:translate-y-0">
								<span class="block truncate text-[10px] font-black text-white">{game.title}</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</aside>
	</div>
</div>
