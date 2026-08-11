<script lang="ts">
	import Footer from '$lib/components/Footer/Footer.svelte';
	import Nav from '$lib/components/Nav/Nav.svelte';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { config } from '$lib/config';
	import '../app.css';
	import customMessage from '$lib/console';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	afterNavigate(() => {
		if (browser) {
			// The tab title is ALWAYS just the current domain (never the brand or a
			// keyword like "proxy"/"games") so network filters (e.g. GoGuardian) that
			// key off the page title see only the URL the site is already served from.
			// A user-chosen tab cloak (tabName) still wins if they set one.
			let tabName = localStorage.getItem('tabName');
			let tabIcon = localStorage.getItem('tabIcon');

			document.title = tabName || location.hostname;
			if (tabIcon) (document.getElementById('favicon') as HTMLLinkElement).href = tabIcon;
		}
	});

	import { isSearchOpen } from '$lib/stores/search';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import { userProfile } from '$lib/stores/userProfile';
	import { telemetry } from '$lib/telemetry';

	onMount(() => {
		customMessage();
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
	<!-- Single source of truth for the tab title: the current domain, SSR-rendered
	     from the request host so even the raw HTML response carries no brand/keyword. -->
	<title>{$page.url.hostname}</title>
	<link
		href="https://fonts.googleapis.com/css2?family={config.fonts
			.googleFont}:wght@100;200;300;400;500;600;700;800;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="font-sans relative flex min-h-screen flex-col bg-base-100">
	<!-- Global top navigation (hidden inside game/app iframes) -->
	{#if !isInIframe}
		<div class={$isSearchOpen ? 'pointer-events-none blur-sm brightness-50' : ''}>
			<Nav />
		</div>
	{/if}

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
