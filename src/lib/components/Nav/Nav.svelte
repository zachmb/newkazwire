<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';

	let searchQuery = '';

	function submitSearch(e: Event) {
		e.preventDefault();
		const q = searchQuery.trim();
		window.location.href = q ? '/search?q=' + encodeURIComponent(q) : '/search';
	}

	const links = [
		{ href: '/', label: 'Games', icon: 'mdi:gamepad-variant' },
		{ href: '/apps', label: 'Apps', icon: 'ri:apps-2-fill' },
		{ href: '/ai', label: 'Create', icon: 'mdi:sparkles' },
		{ href: '/ai/gallery', label: 'Community', icon: 'mdi:account-group' }
	];

	$: pathname = $page.url.pathname;
	const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
</script>

<header class="sticky top-0 z-50 border-b border-base-300 bg-base-100/90 backdrop-blur-md">
	<nav class="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 sm:px-5">
		<!-- Brand -->
		<a href="/" class="flex flex-none items-center gap-2" aria-label={config.branding.name}>
			<img src="/logo.png" alt="" class="h-9 w-9 rounded-lg object-contain" />
			<span class="hidden text-xl font-black tracking-tight text-base-content sm:block">
				Kaz<span class="text-primary">wire</span>
			</span>
		</a>

		<!-- Search -->
		{#if config.features.searchBar}
			<form on:submit={submitSearch} class="mx-auto flex w-full max-w-xl items-center">
				<label class="flex w-full items-center gap-2 rounded-full bg-base-200 px-4 py-2 ring-1 ring-base-300 focus-within:ring-2 focus-within:ring-primary">
					<Icon icon="mdi:magnify" class="text-xl text-base-content/60" />
					<input
						type="text"
						placeholder="Search games…"
						bind:value={searchQuery}
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
					class="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition {isActive(l.href)
						? 'bg-primary/15 text-primary'
						: 'text-base-content/80 hover:bg-base-200 hover:text-base-content'}"
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

		<!-- Theme toggle -->
		<button
			data-toggle-theme="dark,light"
			class="grid h-10 w-10 flex-none place-items-center rounded-full text-base-content/80 transition hover:bg-base-200"
			aria-label="Toggle dark mode"
			title="Toggle dark mode"
		>
			<Icon icon="mdi:theme-light-dark" class="text-xl" />
		</button>

		<!-- Account -->
		<a
			href="/profile"
			class="hidden h-10 w-10 flex-none place-items-center rounded-full text-base-content/80 transition hover:bg-base-200 sm:grid"
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
				class="flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition {isActive(l.href)
					? 'bg-primary/15 text-primary'
					: 'text-base-content/80 hover:bg-base-200'}"
			>
				<Icon icon={l.icon} class="text-base" />
				{l.label}
			</a>
		{/each}
	</div>
</header>
