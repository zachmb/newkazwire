<!--
  /u/[uid] — public, searchable player profile.

  Mobbin references (design source):
  - TikTok "Profile" screen (iOS): big avatar + name + location + joined, then a
    horizontal row of stat tiles above a grid of the creator's work.
    https://mobbin.com/apps/tiktok-ios
  - Dribbble "Search results" / people rows (used on /players) mirror the row style
    that links back here.

  Everything on this page is public. Reads GET /api/profile/{uid}. Degrades to a
  friendly empty state on 404 or fetch failure.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	type Profile = {
		uid: string;
		name: string;
		location?: string;
		gamesCreated: number;
		postsCount: number;
		commentsCount: number;
		gamesPlayed: number;
		streak: number;
		longestStreak: number;
		joinedAt?: string | number;
		lastActiveAt?: string | number;
	};

	type Game = {
		id: string;
		title: string;
		coverUrl?: string;
		avgRating?: number;
		creatorLocation?: string;
	};

	type Post = {
		id: string;
		text: string;
		createdAt?: string | number;
		likes: number;
		gameId?: string;
		gameTitle?: string;
	};

	const uid = $derived($page.params.uid ?? '');

	let loading = $state(true);
	let notFound = $state(false);
	let profile = $state<Profile | null>(null);
	let games = $state<Game[]>([]);
	let posts = $state<Post[]>([]);

	function initial(name: string | undefined): string {
		const n = (name || '').trim();
		return n ? n[0].toUpperCase() : '?';
	}

	function fmtDate(v: string | number | undefined): string {
		if (!v && v !== 0) return '';
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return '';
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	onMount(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/api/profile/${encodeURIComponent(uid)}`);
				if (res.status === 404) {
					if (!cancelled) notFound = true;
					return;
				}
				if (!res.ok) throw new Error(`profile ${res.status}`);
				const data = await res.json();
				if (!data?.success || !data?.profile) {
					if (!cancelled) notFound = true;
					return;
				}
				if (!cancelled) {
					profile = data.profile as Profile;
					games = Array.isArray(data.games) ? (data.games as Game[]) : [];
					posts = Array.isArray(data.posts) ? (data.posts as Post[]) : [];
				}
			} catch (e) {
				// Treat any failure as "nothing public to show" rather than a hard error.
				console.warn('Profile: load failed.', e);
				if (!cancelled) notFound = true;
			} finally {
				if (!cancelled) loading = false;
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	// Stat tiles, derived once the profile resolves. Icon-only (no emoji in chrome).
	const stats = $derived(
		profile
			? [
					{ label: 'Games created', value: profile.gamesCreated, icon: 'mdi:controller-classic' },
					{ label: 'Games played', value: profile.gamesPlayed, icon: 'mdi:play-circle' },
					{ label: 'Current streak', value: profile.streak, icon: 'mdi:fire', accent: true },
					{ label: 'Longest streak', value: profile.longestStreak, icon: 'mdi:trophy' },
					{ label: 'Posts', value: profile.postsCount, icon: 'mdi:message-text' },
					{ label: 'Comments', value: profile.commentsCount, icon: 'mdi:comment-multiple' }
				]
			: []
	);
</script>

<svelte:head>
	<meta
		name="description"
		content={profile
			? `${profile.name}'s Kazwire profile — ${profile.gamesCreated} games created, ${profile.postsCount} posts.`
			: 'A Kazwire player profile.'}
	/>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
	{#if loading}
		<!-- Loading skeleton -->
		<div class="animate-pulse">
			<div class="flex items-center gap-5">
				<div class="h-24 w-24 rounded-full bg-base-300"></div>
				<div class="flex-1 space-y-3">
					<div class="h-7 w-48 rounded bg-base-300"></div>
					<div class="h-4 w-32 rounded bg-base-300"></div>
				</div>
			</div>
			<div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{#each Array(6) as _}
					<div class="h-24 rounded-2xl bg-base-300"></div>
				{/each}
			</div>
		</div>
	{:else if notFound || !profile}
		<!-- Graceful 404 / nothing-public state -->
		<div class="rounded-3xl bg-base-200 px-6 py-16 text-center">
			<Icon icon="mdi:account-off-outline" class="mx-auto text-6xl text-base-content/30" />
			<h1 class="mt-4 text-2xl font-black text-base-content">Nothing to see here yet</h1>
			<p class="mx-auto mt-2 max-w-md text-base-content/60">
				This player hasn't done anything public yet.
			</p>
			<a href="/players" class="btn btn-primary mt-6 rounded-full">
				<Icon icon="mdi:magnify" class="text-lg" />
				Find players
			</a>
		</div>
	{:else}
		<!-- Header -->
		<header class="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
			<div
				class="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary text-4xl font-black text-primary-content shadow-lg"
				aria-hidden="true"
			>
				{initial(profile.name)}
			</div>
			<div class="min-w-0">
				<h1 class="truncate text-3xl font-black text-base-content">{profile.name}</h1>
				<div class="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm font-semibold text-base-content/60 sm:justify-start">
					{#if profile.location}
						<span class="inline-flex items-center gap-1">
							<Icon icon="mdi:map-marker" class="text-base text-primary" />
							{profile.location}
						</span>
					{/if}
					{#if fmtDate(profile.joinedAt)}
						<span class="inline-flex items-center gap-1">
							<Icon icon="mdi:calendar-blank" class="text-base" />
							Joined {fmtDate(profile.joinedAt)}
						</span>
					{/if}
				</div>
			</div>
		</header>

		<!-- Stat tiles -->
		<section class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
			{#each stats as s (s.label)}
				<div class="flex flex-col items-center gap-1 rounded-2xl bg-base-200 p-4 text-center">
					<Icon
						icon={s.icon}
						class={`text-2xl ${s.accent ? 'text-primary' : 'text-base-content/40'}`}
					/>
					<span class="text-2xl font-black leading-none text-base-content">{s.value ?? 0}</span>
					<span class="text-xs font-semibold text-base-content/50">{s.label}</span>
				</div>
			{/each}
		</section>

		<!-- Created games -->
		<section class="mt-10">
			<h2 class="mb-4 flex items-center gap-2 text-xl font-black text-base-content">
				<Icon icon="mdi:controller-classic" class="text-primary" />
				Games created
				<span class="text-sm font-bold text-base-content/40">{games.length}</span>
			</h2>
			{#if games.length === 0}
				<div class="rounded-2xl bg-base-200 p-8 text-center text-sm font-semibold text-base-content/50">
					{profile.name} hasn't published any games yet.
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{#each games as game (game.id)}
						<a
							href="/ai/user-g/{game.id}"
							class="group flex flex-col overflow-hidden rounded-2xl border border-neutral/10 transition-all hover:scale-[1.02] hover:border-primary/30 hover:shadow-xl"
						>
							<div class="relative aspect-video w-full bg-black">
								{#if game.coverUrl}
									<img
										src={game.coverUrl}
										alt={game.title}
										loading="lazy"
										class="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
									/>
								{:else}
									<div class="absolute inset-0 grid place-items-center bg-primary/10">
										<Icon
											icon="mdi:robot"
											class="text-5xl text-primary/40 transition-transform group-hover:scale-110"
										/>
									</div>
								{/if}
							</div>
							<div class="flex items-center justify-between gap-2 p-3">
								<h3 class="truncate text-sm font-black text-base-content">{game.title}</h3>
								<span class="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-primary">
									<Icon icon="mdi:star" />
									{game.avgRating || 'New'}
								</span>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Recent posts -->
		<section class="mt-10">
			<h2 class="mb-4 flex items-center gap-2 text-xl font-black text-base-content">
				<Icon icon="mdi:message-text" class="text-primary" />
				Recent posts
				<span class="text-sm font-bold text-base-content/40">{posts.length}</span>
			</h2>
			{#if posts.length === 0}
				<div class="rounded-2xl bg-base-200 p-8 text-center text-sm font-semibold text-base-content/50">
					No posts yet.
				</div>
			{:else}
				<ul class="space-y-3">
					{#each posts as post (post.id)}
						<li class="rounded-2xl bg-base-200 p-4">
							<p class="whitespace-pre-wrap break-words text-base-content">{post.text}</p>
							<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-base-content/50">
								{#if fmtDate(post.createdAt)}
									<span class="inline-flex items-center gap-1">
										<Icon icon="mdi:clock-outline" class="text-sm" />
										{fmtDate(post.createdAt)}
									</span>
								{/if}
								<span class="inline-flex items-center gap-1">
									<Icon icon="mdi:heart" class="text-sm text-primary" />
									{post.likes ?? 0}
								</span>
								{#if post.gameId && post.gameTitle}
									<a
										href="/ai/user-g/{post.gameId}"
										class="inline-flex items-center gap-1 text-primary hover:underline"
									>
										<Icon icon="mdi:controller-classic" class="text-sm" />
										{post.gameTitle}
									</a>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>
