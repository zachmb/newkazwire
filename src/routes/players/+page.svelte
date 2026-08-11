<!--
  /players — public player search.

  Mobbin references (design source):
  - Instagram "Search" screen (iOS): a single sticky search field at top, results
    appear as compact people rows (avatar + name + secondary line).
    https://mobbin.com/apps/instagram-ios
  - TikTok "Search results — Users" tab: row = round avatar + name + "N · N" meta,
    tapping a row opens that person's profile (here /u/{uid}).
    https://mobbin.com/apps/tiktok-ios

  Debounced input is the source of truth, mirrored into the ?q= URL param (via goto,
  replaceState so typing doesn't stack history) and used to call GET /api/search.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';

	type Player = {
		uid: string;
		name: string;
		location?: string;
		gamesCreated: number;
		postsCount: number;
		commentsCount: number;
		lastActiveAt?: string | number;
	};

	// Seed from the URL so a shared /players?q=... link runs the search on load.
	let query = $state('');
	let results = $state<Player[]>([]);
	let loading = $state(false);
	let searched = $state(false);

	function initial(name: string | undefined): string {
		const n = (name || '').trim();
		return n ? n[0].toUpperCase() : '?';
	}

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	// Bump per keystroke so a slow response for an older query can't overwrite a
	// newer one (last-write-wins by request id).
	let reqId = 0;

	async function runSearch(q: string) {
		const trimmed = q.trim();
		const id = ++reqId;
		if (!trimmed) {
			results = [];
			searched = false;
			loading = false;
			return;
		}
		loading = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
			if (!res.ok) throw new Error(`search ${res.status}`);
			const data = await res.json();
			if (id !== reqId) return; // a newer search superseded this one
			results = data?.success && Array.isArray(data.players) ? (data.players as Player[]) : [];
		} catch (e) {
			console.warn('Player search failed.', e);
			if (id === reqId) results = [];
		} finally {
			if (id === reqId) {
				loading = false;
				searched = true;
			}
		}
	}

	// Sync the ?q= param without stacking a history entry per keystroke.
	function syncUrl(q: string) {
		const trimmed = q.trim();
		const target = trimmed ? `/players?q=${encodeURIComponent(trimmed)}` : '/players';
		if (target !== $page.url.pathname + $page.url.search) {
			goto(target, { replaceState: true, keepFocus: true, noScroll: true });
		}
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			syncUrl(query);
			runSearch(query);
		}, 300);
	}

	onMount(() => {
		const initialQ = ($page.url.searchParams.get('q') || '').trim();
		if (initialQ) {
			query = initialQ;
			runSearch(initialQ);
		}
		return () => clearTimeout(debounceTimer);
	});
</script>

<svelte:head>
	<meta name="description" content="Search players and open their public profiles." />
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
	<h1 class="mb-1 flex items-center gap-2 text-2xl font-black text-base-content">
		<Icon icon="mdi:account-search" class="text-2xl text-primary" />
		Find players
	</h1>
	<p class="mb-6 text-sm font-medium text-base-content/60">
		Search creators by name and open their public profile.
	</p>

	<!-- Search field -->
	<label class="input input-bordered flex items-center gap-3 rounded-full">
		<Icon icon="mdi:magnify" class="text-xl text-base-content/40" />
		<input
			type="search"
			bind:value={query}
			oninput={onInput}
			placeholder="Search players…"
			class="grow bg-transparent"
			autocomplete="off"
			aria-label="Search players"
		/>
		{#if loading}
			<span class="loading loading-spinner loading-sm text-primary"></span>
		{/if}
	</label>

	<!-- Results / states -->
	<div class="mt-6">
		{#if loading && results.length === 0}
			<div class="space-y-3">
				{#each Array(5) as _}
					<div class="flex animate-pulse items-center gap-4 rounded-2xl bg-base-200 p-4">
						<div class="h-12 w-12 rounded-full bg-base-300"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-40 rounded bg-base-300"></div>
							<div class="h-3 w-24 rounded bg-base-300"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else if !query.trim()}
			<!-- Empty (nothing typed yet) -->
			<div class="rounded-3xl bg-base-200 px-6 py-14 text-center">
				<Icon icon="mdi:account-group-outline" class="mx-auto text-5xl text-base-content/30" />
				<p class="mt-3 font-bold text-base-content">Start typing to find players.</p>
				<p class="mt-1 text-sm text-base-content/50">Search by creator name.</p>
			</div>
		{:else if searched && results.length === 0}
			<!-- No results -->
			<div class="rounded-3xl bg-base-200 px-6 py-14 text-center">
				<Icon icon="mdi:account-off-outline" class="mx-auto text-5xl text-base-content/30" />
				<p class="mt-3 font-bold text-base-content">No players found for “{query.trim()}”.</p>
				<p class="mt-1 text-sm text-base-content/50">Try a different name.</p>
			</div>
		{:else}
			<ul class="space-y-3">
				{#each results as player (player.uid)}
					<li>
						<a
							href="/u/{player.uid}"
							class="flex items-center gap-4 rounded-2xl bg-base-200 p-4 transition-all hover:bg-base-300"
						>
							<div
								class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-black text-primary-content"
								aria-hidden="true"
							>
								{initial(player.name)}
							</div>
							<div class="min-w-0 flex-1">
								<div class="truncate font-black text-base-content">{player.name}</div>
								<div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-base-content/50">
									{#if player.location}
										<span class="inline-flex items-center gap-1">
											<Icon icon="mdi:map-marker" class="text-sm text-primary" />
											{player.location}
										</span>
										<span aria-hidden="true">·</span>
									{/if}
									<span>{player.gamesCreated} game{player.gamesCreated === 1 ? '' : 's'}</span>
									<span aria-hidden="true">·</span>
									<span>{player.postsCount} post{player.postsCount === 1 ? '' : 's'}</span>
								</div>
							</div>
							<Icon icon="mdi:chevron-right" class="shrink-0 text-xl text-base-content/30" />
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
