<script lang="ts">
	import { onMount } from 'svelte';
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';

	let query = '';
	let iframe: HTMLIFrameElement;
	let loading = false;
	let browsing = false;
	let swReady = false;
	let error = '';

	function toUrl(input: string): string {
		const s = input.trim();
		if (!s) return '';
		// Looks like a domain / URL?
		const looksUrl = /^[a-z]+:\/\//i.test(s) || /^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(s);
		if (looksUrl) return /^[a-z]+:\/\//i.test(s) ? s : 'https://' + s;
		return 'https://www.google.com/search?q=' + encodeURIComponent(s);
	}

	async function ensureSW() {
		if (swReady) return true;
		try {
			const cfg = (window as any).__uv$config;
			if (!cfg) throw new Error('proxy config not loaded');
			await navigator.serviceWorker.register('/uv.js', { scope: cfg.prefix });
			await navigator.serviceWorker.ready;
			swReady = true;
			return true;
		} catch (e: any) {
			error = 'Could not start the proxy service worker: ' + (e?.message || e);
			return false;
		}
	}

	async function go(e?: Event) {
		e?.preventDefault();
		error = '';
		const url = toUrl(query);
		if (!url) return;
		if (!(await ensureSW())) return;
		const cfg = (window as any).__uv$config;
		loading = true;
		browsing = true;
		const encoded = cfg.prefix + cfg.encodeUrl(url);
		// small delay lets a freshly-installed SW take control
		requestAnimationFrame(() => {
			if (iframe) iframe.src = encoded;
		});
	}

	function reload() {
		if (iframe && iframe.src) {
			loading = true;
			iframe.src = iframe.src;
		}
	}
	function openTab() {
		if (iframe && iframe.src) window.open(iframe.src, '_blank');
	}

	onMount(() => {
		window.scrollTo(0, 0);
		ensureSW();
	});

	const quickLinks = [
		{ label: 'Google', url: 'https://google.com', icon: 'mdi:google' },
		{ label: 'YouTube', url: 'https://youtube.com', icon: 'mdi:youtube' },
		{ label: 'Wikipedia', url: 'https://wikipedia.org', icon: 'mdi:wikipedia' },
		{ label: 'Reddit', url: 'https://reddit.com', icon: 'mdi:reddit' },
		{ label: 'Discord', url: 'https://discord.com', icon: 'ic:baseline-discord' },
		{ label: 'Spotify', url: 'https://open.spotify.com', icon: 'mdi:spotify' }
	];
	function quick(url: string) {
		query = url;
		go();
	}
</script>

<svelte:head>
	<title>{config.branding.name} — Proxy</title>
	<meta name="description" content="Browse the web freely and privately through the {config.branding.name} proxy." />
	<script src="/uv/uv.bundle.js"></script>
	<script src="/uv/uv.config.js"></script>
</svelte:head>

<div class="flex h-[calc(100vh-4rem)] flex-col bg-base-100">
	<!-- Address bar -->
	<form on:submit={go} class="flex items-center gap-2 border-b border-base-300 bg-base-200 px-3 py-2">
		<button type="button" on:click={reload} class="grid h-10 w-10 flex-none place-items-center rounded-full text-base-content/70 transition hover:bg-base-300" aria-label="Reload" title="Reload">
			<Icon icon="mdi:refresh" class="text-xl" />
		</button>
		<label class="flex w-full items-center gap-2 rounded-full bg-base-100 px-4 py-2 ring-1 ring-base-300 focus-within:ring-2 focus-within:ring-primary">
			<Icon icon="mdi:shield-lock" class="text-xl text-primary" />
			<input
				bind:value={query}
				type="text"
				inputmode="url"
				placeholder="Search Google or enter a website"
				class="w-full bg-transparent text-sm font-medium text-base-content placeholder:text-base-content/50 focus:outline-none"
			/>
		</label>
		<button type="submit" class="flex flex-none items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110">
			<Icon icon="mdi:arrow-right" class="text-lg" /> <span class="hidden sm:inline">Go</span>
		</button>
		<button type="button" on:click={openTab} class="grid h-10 w-10 flex-none place-items-center rounded-full text-base-content/70 transition hover:bg-base-300" aria-label="Open in new tab" title="Open in new tab">
			<Icon icon="mdi:open-in-new" class="text-xl" />
		</button>
	</form>

	{#if error}
		<div class="bg-error/10 px-4 py-2 text-sm font-semibold text-error">{error}</div>
	{/if}

	<!-- Viewport -->
	<div class="relative flex-1 bg-base-100">
		{#if !browsing}
			<div class="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
				<div class="grid h-20 w-20 place-items-center rounded-3xl bg-primary/15 text-primary">
					<Icon icon="mdi:shield-lock" class="text-5xl" />
				</div>
				<div>
					<h1 class="text-3xl font-black text-base-content">Private Proxy</h1>
					<p class="mx-auto mt-2 max-w-md text-base-content/70">
						Browse any site right here — search above or jump to a favorite. Traffic routes through {config.branding.name}'s own server.
					</p>
				</div>
				<div class="flex flex-wrap justify-center gap-2">
					{#each quickLinks as q}
						<button on:click={() => quick(q.url)} class="flex items-center gap-2 rounded-full bg-base-200 px-4 py-2 text-sm font-bold text-base-content transition hover:bg-primary hover:text-white">
							<Icon icon={q.icon} class="text-lg" /> {q.label}
						</button>
					{/each}
				</div>
				<p class="max-w-md text-xs text-base-content/50">
					Heads up: a proxy is not a VPN. It hides the destination from your network, but the site can still see it's being accessed. Don't use it for anything sensitive.
				</p>
			</div>
		{/if}

		{#if loading}
			<div class="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
				<span class="loading loading-dots loading-md text-primary"></span>
			</div>
		{/if}

		<iframe
			bind:this={iframe}
			title="Proxy browser"
			class="h-full w-full border-0 {browsing ? 'block' : 'hidden'}"
			on:load={() => (loading = false)}
		></iframe>
	</div>
</div>
