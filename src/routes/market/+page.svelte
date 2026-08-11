<script lang="ts">
	// /market — standalone KazMarket page. The market UI now lives in a shared
	// component (also embedded in the account Shop tab). This page keeps the
	// public route + deep-links (/market?asset=…) working.
	import { config } from '$lib/config';
	import KazMarket from '$lib/components/KazMarket.svelte';
</script>

<svelte:head><title>KazMarket — {config.branding.name}</title></svelte:head>

<div class="min-h-screen bg-base-100">
	<div class="mx-auto max-w-5xl px-4 py-6">
		<KazMarket />
	</div>
</div>
