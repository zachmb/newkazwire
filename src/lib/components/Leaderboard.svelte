<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	interface Entry {
		name: string;
		streak: number;
		longest: number;
		gamesPlayed: number;
	}

	/** Optional heading; pass `title={null}` to render the list bare. */
	export let title: string | null = 'Top Streaks';

	let leaders: Entry[] = [];
	let loading = true;
	let failed = false;

	onMount(async () => {
		try {
			const res = await fetch('/api/leaderboard');
			const data = await res.json();
			if (data?.success && Array.isArray(data.leaders)) {
				leaders = data.leaders;
			} else {
				failed = true;
			}
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	});

	// Medal color per top-3 rank (gold/silver/bronze), grounded in Mimo's leaderboard.
	function medalColor(rank: number): string {
		if (rank === 1) return 'text-yellow-500';
		if (rank === 2) return 'text-slate-400';
		if (rank === 3) return 'text-amber-700';
		return '';
	}

	function initials(name: string): string {
		return (name || '?').trim().charAt(0).toUpperCase() || '?';
	}
</script>

<!--
	Leaderboard grounded in the Mimo Weekly Leaderboard
	(mobbin.com/screens/81103f71-3ffb-4035-b4ef-1cd51050287e): a clean vertical row
	list — trophy for the top 3, a plain rank number after, a circular avatar, the
	player name, and a right-aligned bolt/flame + streak count. Kazwire swaps in the
	orange flame + brand primary tint.
-->
<div class="w-full">
	{#if title}
		<div class="mb-3 flex items-center gap-2">
			<Icon icon="mdi:fire" class="text-xl text-primary" />
			<h2 class="text-lg font-bold text-neutral">{title}</h2>
		</div>
	{/if}

	{#if loading}
		<ul class="space-y-2">
			{#each Array(5) as _}
				<li class="flex items-center gap-3 rounded-xl bg-base-200 p-3">
					<div class="h-9 w-9 animate-pulse rounded-full bg-base-300"></div>
					<div class="h-4 flex-1 animate-pulse rounded bg-base-300"></div>
					<div class="h-4 w-10 animate-pulse rounded bg-base-300"></div>
				</li>
			{/each}
		</ul>
	{:else if failed}
		<p class="rounded-xl bg-base-200 p-4 text-sm text-base-content/60">
			Couldn’t load the leaderboard right now. Try again in a bit.
		</p>
	{:else if leaders.length === 0}
		<p class="rounded-xl bg-base-200 p-4 text-sm text-base-content/60">
			No streaks yet — play a game today to start one!
		</p>
	{:else}
		<ul class="space-y-1.5">
			{#each leaders as entry, i}
				{@const rank = i + 1}
				<li
					class="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors {rank <= 3
						? 'bg-primary/5 ring-1 ring-primary/10'
						: 'hover:bg-base-200'}"
				>
					<!-- Rank: trophy for top 3, number otherwise -->
					<div class="flex w-6 shrink-0 items-center justify-center">
						{#if rank <= 3}
							<Icon icon="mdi:trophy" class="text-xl {medalColor(rank)}" />
						{:else}
							<span class="text-sm font-semibold text-base-content/50">{rank}</span>
						{/if}
					</div>

					<!-- Avatar (initial) -->
					<div
						class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary"
						aria-hidden="true"
					>
						{initials(entry.name)}
					</div>

					<!-- Name + subtitle -->
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold text-neutral">{entry.name}</p>
						<p class="truncate text-xs text-base-content/50">
							{entry.gamesPlayed} plays · best {entry.longest}
						</p>
					</div>

					<!-- Current streak -->
					<div class="flex shrink-0 items-center gap-1 font-bold text-primary">
						<Icon icon="mdi:fire" class="text-base" />
						<span class="tabular-nums">{entry.streak}</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
