<script lang="ts">
	import Footer from '$lib/components/Footer/Footer.svelte';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { config } from '$lib/config';
	import '../app.css';
	import customMessage from '$lib/console';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { themeChange } from 'theme-change';

	afterNavigate(() => {
		if (browser) {
			let tabName = localStorage.getItem('tabName');
			let tabIcon = localStorage.getItem('tabIcon');

			if (tabName) document.getElementsByTagName('title')[0].innerText = tabName;
			if (tabIcon) (document.getElementById('favicon') as HTMLLinkElement).href = tabIcon;
		}
	});

	import { isSearchOpen } from '$lib/stores/search';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import { userProfile } from '$lib/stores/userProfile';
	import { telemetry } from '$lib/telemetry';

	onMount(() => {
		customMessage();
		themeChange(false);
		telemetry.init();

		// Check for daily reward immediately
		userProfile.claimDailyReward();

		// Passive income: 1 coin every minute
		const coinInterval = setInterval(() => {
			userProfile.addCoins(1);
		}, 60000);


		return () => {
			clearInterval(coinInterval);
		};
	});

	// Hide footer on game and app pages
	let isInIframe = false;
	onMount(() => {
		isInIframe = window.self !== window.top;
	});

	$: hideFooter =
		isInIframe ||
		($page.url.pathname.startsWith('/g/') && $page.url.pathname !== '/g') ||
		($page.url.pathname.startsWith('/apps/') && $page.url.pathname !== '/apps') ||
		$page.url.pathname.startsWith('/search');
</script>

<svelte:head>
	<link
		href="https://fonts.googleapis.com/css2?family={config.fonts
			.googleFont}:wght@100;200;300;400;500;600;700;800;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="font-sans relative flex min-h-screen flex-col bg-base-100">
	<!-- Main Content with Blur Effect -->
	<main
		class="w-full flex-grow transition-all duration-300 {$isSearchOpen
			? 'pointer-events-none scale-[0.99] blur-sm brightness-50'
			: ''}"
	>
		<slot />
	</main>

	<!-- Footer: Hidden on individual game/app pages -->
	{#if !hideFooter}
		<div class={$isSearchOpen ? 'blur-sm brightness-50' : ''}>
			<Footer />
		</div>
	{/if}

	<!-- Global Search Overlay -->
	<SearchOverlay />
</div>
