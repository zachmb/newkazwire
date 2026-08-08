<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
</script>

<svelte:head>
	<title>Plans - {config.branding.name}</title>
</svelte:head>

<div class="min-h-screen bg-base-100 p-6 md:p-12">
	<div class="mx-auto max-w-4xl">
		<!-- Header -->
		<header class="mb-6">
			<h1 class="text-4xl font-bold">Plans</h1>
		</header>

		<!-- Plans -->
		<div class="mb-6">
			<div class="mb-4">
				<h2 class="text-2xl font-bold">Free</h2>
				<p class="text-base text-base-content/70">Unlimited games, limited storage.</p>
			</div>
			<div class="mb-4">
				<h2 class="text-2xl font-bold">Pro</h2>
				<p class="text-base text-base-content/70">Unlimited games, unlimited storage.</p>
			</div>
		</div>
	</div>
</div>