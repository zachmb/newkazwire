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
	import WindowManager from '$lib/components/Desktop/WindowManager.svelte';
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

		// AD-OVERLAY ESCAPE HATCH. Google's auto-ads rewarded/vignette prompt
		// ("Unlock more content — watch a short ad") sometimes renders with no
		// close control and re-fires every ~10 min, trapping the player. Any
		// full-viewport fixed overlay containing a Google ad iframe gets our own
		// working ✕ that removes it and restores scrolling. (Root fix lives in the
		// AdSense dashboard: Auto ads → disable the Rewarded format.)
		const AD_SRC = /googlesyndication|googleads|doubleclick|adtrafficquality/;
		const ensureEscape = () => {
			const cands = new Set<HTMLElement>();
			for (const el of Array.from(document.body.children)) {
				if (el instanceof HTMLElement) cands.add(el);
			}
			document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
				if (el instanceof HTMLElement) cands.add(el);
			});
			for (const el of cands) {
				if (el.dataset.kzAdEscape) continue;
				const cs = getComputedStyle(el);
				if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
				const r = el.getBoundingClientRect();
				const coversViewport = r.width >= innerWidth * 0.85 && r.height >= innerHeight * 0.85;
				if (!coversViewport) continue;
				const hasAdFrame = Array.from(el.querySelectorAll('iframe')).some((f) =>
					AD_SRC.test(f.src || '')
				);
				if (!hasAdFrame) continue;

				el.dataset.kzAdEscape = '1';
				const btn = document.createElement('button');
				btn.textContent = '✕';
				btn.setAttribute('aria-label', 'Close ad');
				btn.style.cssText =
					'position:fixed;top:14px;right:14px;z-index:2147483647;width:40px;height:40px;' +
					'border-radius:9999px;border:none;background:rgba(0,0,0,.75);color:#fff;' +
					'font-size:18px;font-weight:700;cursor:pointer;line-height:1;';
				btn.addEventListener('click', () => {
					el.remove();
					// The overlay locks page scroll — undo whatever it pinned.
					document.documentElement.style.overflow = '';
					document.body.style.overflow = '';
					document.body.style.position = '';
				});
				el.appendChild(btn);
			}
		};
		const adEscapeInterval = setInterval(ensureEscape, 2000);

		return () => {
			clearInterval(coinInterval);
			clearInterval(adEscapeInterval);
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

	<!-- Floating snap windows (desktop): open games/apps side-by-side. Never
	     rendered when this page is itself inside a window iframe. -->
	{#if !isInIframe}
		<WindowManager />
	{/if}
</div>
