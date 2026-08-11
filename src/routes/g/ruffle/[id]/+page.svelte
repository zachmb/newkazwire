<script lang="ts">
	import { config } from '$lib/config';
	import { CDN_BASE_URL } from '$lib/utils/cdn';
	import type { PageData } from './$types';
	export let data: PageData;
</script>

<svelte:head>
	<meta
		name="description"
		content="Play {data.game.title} for free now on {config.branding.name}!"
	/>
	<meta
		property="og:description"
		content="Play {data.game.title} for free now on {config.branding.name}!"
	/>
	<script src="{CDN_BASE_URL}/game/ruffle/ruffle/ruffle.js"></script>
</svelte:head>

{#if data.game.emulatorType == 'ruffle'}
	<embed
		src="{CDN_BASE_URL}/game/ruffle/{data.game.id}/{data.game.id}.swf"
		class="absolute h-[100vh] w-[100vw]"
	/>
{/if}
