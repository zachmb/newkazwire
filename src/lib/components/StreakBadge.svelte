<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { pingStreak, getMyStreak, type MyStreak } from '$lib/utils/streak';

	/**
	 * When true (default) the badge records a play on mount (fires pingStreak).
	 * Set `pingOnMount={false}` for a display-only badge (e.g. header/leaderboard
	 * page) that should show the current streak without counting a new play.
	 */
	export let pingOnMount = true;

	let streak = 0;
	let loaded = false;

	onMount(async () => {
		let data: MyStreak | null;
		if (pingOnMount) {
			data = await pingStreak();
			// pingStreak may return the cached streak (session-guarded); fall back to a read.
			if (!data) data = await getMyStreak();
		} else {
			data = await getMyStreak();
		}
		if (data) streak = data.streak;
		loaded = true;
	});
</script>

<!--
	Streak badge grounded in the Mimo weekly-leaderboard streak chip
	(mobbin.com/screens/81103f71-3ffb-4035-b4ef-1cd51050287e): a compact pill with a
	bolt/flame glyph + a bold count. Kazwire uses the orange flame on the brand
	primary tint so it reads as a "hot streak".
-->
{#if loaded && streak > 0}
	<span
		class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary ring-1 ring-primary/20"
		title="{streak}-day play streak — come back tomorrow to keep it alive!"
		aria-label="{streak} day play streak"
	>
		<Icon icon="mdi:fire" class="text-base text-primary" />
		<span>{streak}</span>
	</span>
{/if}
