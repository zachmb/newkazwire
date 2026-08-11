<script lang="ts">
	// Reusable player search — used on the account "Players" tab (and /players).
	// Search creators by name and open their public profile at /u/{uid}.
	import Icon from '@iconify/svelte';

	type Player = { uid: string; name: string; location?: string; gamesCreated: number; postsCount: number; commentsCount: number };

	let query = $state('');
	let results = $state<Player[]>([]);
	let loading = $state(false);
	let searched = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let reqId = 0;

	function initial(name: string | undefined): string {
		const n = (name || '').trim();
		return n ? n[0].toUpperCase() : '?';
	}

	async function runSearch(q: string) {
		const trimmed = q.trim();
		const id = ++reqId;
		if (!trimmed) { results = []; searched = false; loading = false; return; }
		loading = true;
		try {
			const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
			if (!res.ok) throw new Error(`search ${res.status}`);
			const data = await res.json();
			if (id !== reqId) return;
			results = data?.success && Array.isArray(data.players) ? (data.players as Player[]) : [];
		} catch {
			if (id === reqId) results = [];
		} finally {
			if (id === reqId) { loading = false; searched = true; }
		}
	}

	function onInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => runSearch(query), 300);
	}
</script>

<div>
	<label class="input input-bordered flex items-center gap-3 rounded-full">
		<Icon icon="mdi:magnify" class="text-xl text-base-content/40" />
		<input type="search" bind:value={query} oninput={onInput} placeholder="Search players by name…" class="grow bg-transparent" autocomplete="off" aria-label="Search players" />
		{#if loading}<span class="loading loading-spinner loading-sm text-primary"></span>{/if}
	</label>

	<div class="mt-4">
		{#if loading && results.length === 0}
			<div class="space-y-3">
				{#each Array(4) as _}
					<div class="flex animate-pulse items-center gap-4 rounded-2xl bg-base-200 p-4">
						<div class="h-12 w-12 rounded-full bg-base-300"></div>
						<div class="flex-1 space-y-2"><div class="h-4 w-40 rounded bg-base-300"></div><div class="h-3 w-24 rounded bg-base-300"></div></div>
					</div>
				{/each}
			</div>
		{:else if !query.trim()}
			<div class="rounded-3xl bg-base-200 px-6 py-12 text-center">
				<Icon icon="mdi:account-group-outline" class="mx-auto text-5xl text-base-content/30" />
				<p class="mt-3 font-bold text-base-content">Start typing to find players.</p>
			</div>
		{:else if searched && results.length === 0}
			<div class="rounded-3xl bg-base-200 px-6 py-12 text-center">
				<Icon icon="mdi:account-off-outline" class="mx-auto text-5xl text-base-content/30" />
				<p class="mt-3 font-bold text-base-content">No players found for “{query.trim()}”.</p>
			</div>
		{:else}
			<ul class="space-y-3">
				{#each results as player (player.uid)}
					<li>
						<a href="/u/{player.uid}" class="flex items-center gap-4 rounded-2xl bg-base-200 p-4 transition-all hover:bg-base-300">
							<div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-black text-primary-content">{initial(player.name)}</div>
							<div class="min-w-0 flex-1">
								<div class="truncate font-black text-base-content">{player.name}</div>
								<div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-semibold text-base-content/50">
									{#if player.location}<span class="inline-flex items-center gap-1"><Icon icon="mdi:map-marker" class="text-sm text-primary" />{player.location}</span><span aria-hidden="true">·</span>{/if}
									<span>{player.gamesCreated} game{player.gamesCreated === 1 ? '' : 's'}</span><span aria-hidden="true">·</span><span>{player.postsCount} post{player.postsCount === 1 ? '' : 's'}</span>
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
