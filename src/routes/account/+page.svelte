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

	let isEditingUsername = false;
	let newUsername = $userProfile.username;
	let recentGamesList = [];
	let activeTab = 'profile';

	let publishingIds = new Set();
	let successfullyPublishedIds = new Set();
	let publishError = '';

	const TABS = [
		{ id: 'profile',     label: 'Profile',     icon: 'mdi:account' },
		{ id: 'ai-games',    label: 'AI Games',    icon: 'mdi:robot' },
		{ id: 'shop',        label: 'Shop',        icon: 'mdi:store' },
		{ id: 'leaderboard', label: 'Leaderboard', icon: 'mdi:trophy' }
	];

	const SHOP_ITEMS = [
		{ id: 'b_neon',    name: 'Neon Background', price: 500,  icon: 'mdi:image-filter-hdr', type: 'Background', color: 'from-violet-500 to-purple-600'  },
		{ id: 'c_gold',    name: 'Gold Cursor',     price: 1000, icon: 'mdi:cursor-default',   type: 'Cursor',     color: 'from-yellow-400 to-amber-500'   },
		{ id: 'r_vip',     name: 'VIP Role',        price: 5000, icon: 'mdi:crown',            type: 'Role',       color: 'from-orange-500 to-red-500'     },
		{ id: 'l_discord', name: 'Discord Link',    price: 100,  icon: 'mdi:link-variant',     type: 'Link',       color: 'from-indigo-400 to-blue-500'    },
		{ id: 'c_trail',   name: 'Mouse Trail',     price: 750,  icon: 'mdi:auto-fix',         type: 'Effect',     color: 'from-pink-500 to-rose-500'      },
		{ id: 'a_frog',    name: 'Frog Avatar',     price: 250,  icon: 'mdi:face-man-profile', type: 'Avatar',     color: 'from-orange-500 to-blue-500'   }
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
		userProfile.updateUsername(newUsername);
		isEditingUsername = false;
	}

	function startEditing() {
		newUsername = $userProfile.username;
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
									<h1 class="text-4xl font-black text-white drop-shadow">{$userProfile.username}</h1>
									<button
										class="rounded-full p-1.5 opacity-0 transition-opacity hover:bg-white/20 group-hover:opacity-100"
										on:click={startEditing}
										aria-label="Edit username"
									><Icon icon="mdi:pencil" class="text-white" /></button>
								</div>
							{/if}
							<p class="mt-1 text-sm font-semibold text-white/60">Joined {$userProfile.joinDate}</p>
						</div>

						<!-- Coins -->
						<div class="flex shrink-0 items-center gap-3 rounded-2xl bg-black/20 px-5 py-3 backdrop-blur-sm">
							<Icon icon="mdi:currency-usd-circle" class="text-3xl text-yellow-300" />
							<div>
								<div class="text-2xl font-black leading-none text-white">{$userProfile.coins.toLocaleString()}</div>
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

				<!-- Stat strip — inside the banner, darker bottom -->
				<div class="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 sm:grid-cols-4">
					{#each [
						{ icon: 'mdi:fire',           value: $userProfile.streak,              label: 'Day Streak',    color: 'text-orange-300' },
						{ icon: 'mdi:gamepad-variant', value: $userProfile.gamesPlayed || 0,   label: 'Games Played',  color: 'text-sky-300'    },
						{ icon: 'mdi:heart',           value: $userProfile.favoriteGames.length, label: 'Favorites',   color: 'text-pink-300'   },
						{ icon: 'mdi:robot',           value: $localAiGames.length,             label: 'AI Games',     color: 'text-violet-300' }
					] as stat}
						<div class="flex items-center gap-3 bg-black/15 px-5 py-4">
							<Icon icon={stat.icon} class="text-2xl {stat.color} shrink-0" />
							<div>
								<div class="text-xl font-black text-white">{stat.value}</div>
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
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between rounded-3xl bg-base-100 px-6 py-4 shadow-lg">
						<h2 class="flex items-center gap-2 text-xl font-black text-base-content">
							<span class="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15"><Icon icon="mdi:store" class="text-amber-600" /></span>
							Item Shop
						</h2>
						<div class="flex items-center gap-2 rounded-2xl bg-yellow-50 px-4 py-2">
							<Icon icon="mdi:currency-usd-circle" class="text-xl text-yellow-500" />
							<span class="font-black text-yellow-700">{$userProfile.coins.toLocaleString()} coins</span>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
						{#each SHOP_ITEMS as item}
							<div class="group flex flex-col overflow-hidden rounded-3xl bg-base-100 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
								<div class="relative flex h-32 items-center justify-center bg-gradient-to-br {item.color}">
									<Icon icon={item.icon} class="text-5xl text-white drop-shadow-lg" />
									<span class="absolute right-3 top-3 rounded-full bg-black/20 px-2.5 py-1 text-xs font-black text-white backdrop-blur-sm">{item.type}</span>
								</div>
								<div class="flex flex-1 flex-col p-4">
									<div class="mb-3 font-black text-base-content">{item.name}</div>
									<div class="mt-auto">
										{#if $userProfile.inventory.includes(item.id)}
											<div class="flex items-center gap-1.5 text-sm font-bold text-success">
												<Icon icon="mdi:check-circle" />Owned
											</div>
										{:else}
											<button
												class="btn btn-primary btn-sm btn-block rounded-xl font-black text-white"
												on:click={() => userProfile.purchaseItem(item.id, item.price)}
												disabled={$userProfile.coins < item.price}
											>
												<Icon icon="mdi:currency-usd-circle" />{item.price}
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>

			<!-- LEADERBOARD -->
			{:else if activeTab === 'leaderboard'}
				<div class="flex flex-col gap-4">
					<!-- Banner -->
					<div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yellow-400 to-orange-500 p-7 text-white shadow-lg">
						<div class="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
						<div class="relative flex items-center justify-between">
							<div>
								<h3 class="text-2xl font-black">Weekly Championship</h3>
								<p class="mt-1 font-semibold opacity-80">Resets in 2 days · Top prize: Discord "Champion" role</p>
							</div>
							<Icon icon="mdi:trophy" class="text-6xl text-yellow-200 drop-shadow-lg" />
						</div>
					</div>

					<!-- Table -->
					<div class="overflow-hidden rounded-3xl bg-base-100 shadow-lg">
						<table class="table w-full">
							<thead>
								<tr class="bg-neutral/5 text-xs font-black uppercase tracking-wider text-base-content/40">
									<th class="w-14 py-4">Rank</th>
									<th class="py-4">Player</th>
									<th class="py-4 text-right">Level</th>
									<th class="py-4 text-right">Coins</th>
								</tr>
							</thead>
							<tbody>
								{#each [
									{ rank: 1, name: 'FrogMaster99', level: 42, coins: 15420, isUser: false },
									{ rank: 2, name: 'MathWizard',   level: 38, coins: 12500, isUser: false },
									{ rank: 3, name: 'SpeedRunner',  level: 35, coins: 9800,  isUser: false },
									{ rank: 4, name: $userProfile.username, level: $userProfile.level, coins: $userProfile.coins, isUser: true },
									{ rank: 5, name: 'RetroGamer',   level: 20, coins: 5000,  isUser: false }
								] as player}
									<tr class="border-t border-neutral/8 transition-colors {player.isUser ? 'bg-primary/5' : 'hover:bg-base-100'}">
										<td class="py-4 font-black">
											{#if player.rank === 1}<Icon icon="mdi:medal" class="text-2xl text-yellow-400" />
											{:else if player.rank === 2}<Icon icon="mdi:medal" class="text-2xl text-slate-400" />
											{:else if player.rank === 3}<Icon icon="mdi:medal" class="text-2xl text-orange-400" />
											{:else}<span class="text-base-content/30">#{player.rank}</span>{/if}
										</td>
										<td class="py-4">
											<div class="flex items-center gap-3">
												<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black
													{player.isUser ? 'bg-primary text-white' : 'bg-neutral/10 text-base-content/50'}">
													{player.name.substring(0, 2).toUpperCase()}
												</div>
												<span class="font-bold {player.isUser ? 'text-primary' : 'text-base-content'}">{player.name}</span>
												{#if player.isUser}<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary">You</span>{/if}
											</div>
										</td>
										<td class="py-4 text-right font-mono font-bold text-base-content/60">{player.level}</td>
										<td class="py-4 text-right font-mono font-bold text-yellow-600">{player.coins.toLocaleString()}</td>
									</tr>
								{/each}
							</tbody>
						</table>
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
