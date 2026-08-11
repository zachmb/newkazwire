<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import { isSearchOpen, searchQuery } from '$lib/stores/search';
	import { onMount } from 'svelte';

	let theme = 'light';
	onMount(() => {
		theme = document.documentElement.getAttribute('data-theme') || 'light';
	});
	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		try {
			localStorage.setItem('kz-theme', theme);
		} catch (e) {
			/* ignore */
		}
	}

	function openSearch() {
		isSearchOpen.set(true);
	}
	function submitSearch(e: Event) {
		e.preventDefault();
		isSearchOpen.set(true);
	}

	const links = [
		{ href: '/', label: 'Games', icon: 'mdi:gamepad-variant' },
		{ href: '/apps', label: 'Apps', icon: 'ri:apps-2-fill' },
		{ href: '/ai', label: 'Create', icon: 'mdi:sparkles' },
		{ href: '/ai/gallery', label: 'Community', icon: 'mdi:account-group' }
	];

	// Exact match for '/' and '/ai' (so /ai/gallery highlights Community, not Create);
	// prefix match (href + '/') for everything else. Takes pathname as an arg so the
	// template expression re-evaluates reactively on client-side navigation.
	const isActive = (href: string, pathname: string) => {
		if (href === '/' || href === '/ai') return pathname === href;
		return pathname === href || pathname.startsWith(href + '/');
	};
</script>

<!--
	Top nav grounded in real product headers pulled via Mobbin MCP:
	Netflix (mobbin.com/screens/651b69e1-68af-49a9-9b27-687559314100) + Prime Video
	(mobbin.com/screens/3e299f78-7290-4469-a99f-0e95f9ee2b17): flat bar, wordmark hard
	left, links + actions right, single hairline bottom border. Search field styled after
	YouTube Playables (mobbin.com/screens/51422fe7-611e-4ab3-a865-fa61050ff5ce).
-->
<header class="sticky top-0 z-50 border-b border-base-300 bg-base-100/95 backdrop-blur-md">
	<nav class="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 sm:px-5">
		<!--
			BRAND TILE — explicitly self-lit so it survives OS/UA dark mode.
			Bug fix: the wordmark previously inherited theme colors; a UA honoring
			prefers-color-scheme:dark could render it invisible. We pin an explicit
			light background chip + explicit dark ink on the tile so it is always
			readable regardless of the surrounding theme or OS setting.
		-->
		<a
			href="/"
			class="brand-tile flex flex-none items-center gap-2 rounded-xl px-2 py-1.5 sm:pr-3"
			aria-label={config.branding.name}
		>
			<img src="/logo.png" alt="" class="h-8 w-8 rounded-lg object-contain" />
			<span class="hidden text-xl font-black leading-none tracking-tight sm:block">
				kaz<span style="color:#FF6A1A">wire</span><span class="text-[#0B1B33]/60">.com</span>
			</span>
		</a>

		<!-- Search -->
		{#if config.features.searchBar}
			<form on:submit={submitSearch} class="mx-auto flex w-full max-w-xl items-center">
				<label class="flex w-full items-center gap-2 rounded-lg bg-base-200 px-4 py-2 ring-1 ring-base-300 transition focus-within:bg-base-100 focus-within:ring-2 focus-within:ring-primary">
					<Icon icon="mdi:magnify" class="text-xl text-base-content/60" />
					<input
						type="text"
						placeholder="Search games…"
						bind:value={$searchQuery}
						on:focus={openSearch}
						on:input={openSearch}
						class="w-full bg-transparent text-sm font-medium text-base-content placeholder:text-base-content/50 focus:outline-none"
						aria-label="Search games"
					/>
				</label>
			</form>
		{:else}
			<div class="mx-auto"></div>
		{/if}

		<!-- Desktop links -->
		<div class="hidden flex-none items-center gap-1 lg:flex">
			{#each links as l}
				<a
					href={l.href}
					class="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition {isActive(l.href, $page.url.pathname)
						? 'bg-primary/15 text-primary'
						: 'text-base-content/80 hover:bg-primary/10 hover:text-primary'}"
				>
					<Icon icon={l.icon} class="text-lg" />
					{l.label}
				</a>
			{/each}
		</div>

		<!-- Proxy CTA (always visible, prominent) -->
		<a
			href="/proxy"
			class="flex flex-none items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110 sm:px-4"
			title="Open the private web proxy"
		>
			<Icon icon="mdi:shield-lock" class="text-lg" />
			<span class="hidden sm:inline">Proxy</span>
		</a>

		<!-- Theme toggle (light/dark) -->
		<button
			on:click={toggleTheme}
			class="grid h-10 w-10 flex-none place-items-center rounded-full text-base-content/80 transition hover:bg-primary/10 hover:text-primary"
			aria-label="Toggle dark mode"
			title="Toggle dark mode"
		>
			<Icon icon={theme === 'dark' ? 'mdi:weather-sunny' : 'mdi:weather-night'} class="text-xl" />
		</button>

		<!-- Account -->
		<a
			href="/account"
			class="grid h-10 w-10 flex-none place-items-center rounded-full text-base-content/80 transition hover:bg-primary/10 hover:text-primary"
			aria-label="Account"
			title="Account"
		>
			<Icon icon="ri:account-circle-fill" class="text-2xl" />
		</a>
	</nav>

	<!-- Mobile link bar -->
	<div class="flex items-center gap-1 overflow-x-auto border-t border-base-300 px-3 py-1.5 lg:hidden">
		{#each links as l}
			<a
				href={l.href}
				class="flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition {isActive(l.href, $page.url.pathname)
					? 'bg-primary/15 text-primary'
					: 'text-base-content/80 hover:bg-primary/10 hover:text-primary'}"
			>
				<Icon icon={l.icon} class="text-base" />
				{l.label}
			</a>
		{/each}
	</div>
</header>

<style>
	/*
		Force the brand tile to a fixed light-on-dark-ink treatment. `color-scheme: light`
		stops a dark-mode UA from re-inking form/text controls, and the explicit background +
		color guarantee the wordmark is visible even if the document theme flips to dark.
	*/
	.brand-tile {
		color-scheme: light;
		background: #ffffff;
		color: #0b1b33;
		box-shadow: inset 0 0 0 1px rgba(11, 27, 51, 0.08);
	}
	.brand-tile:hover {
		box-shadow: inset 0 0 0 1px rgba(255, 106, 26, 0.35);
	}
</style>
