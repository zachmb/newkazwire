<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import Cloak from '$lib/components/Cloak.svelte';

	let query = '';
	let iframe: HTMLIFrameElement;
	let loading = false;
	let browsing = false;
	let error = '';

	function toUrl(input: string): string {
		const s = input.trim();
		if (!s) return '';
		// Looks like a domain / URL?
		const looksUrl = /^[a-z]+:\/\//i.test(s) || /^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(s);
		if (looksUrl) return /^[a-z]+:\/\//i.test(s) ? s : 'https://' + s;
		return 'https://www.google.com/search?q=' + encodeURIComponent(s);
	}

	function loadScript(src: string): Promise<void> {
		return new Promise((resolve, reject) => {
			if (document.querySelector(`script[data-kz="${src}"]`)) return resolve();
			const el = document.createElement('script');
			el.src = src;
			el.dataset.kz = src;
			el.onload = () => resolve();
			el.onerror = () => reject(new Error('failed to load ' + src));
			document.head.appendChild(el);
		});
	}

	async function loadUVConfig() {
		if ((window as any).__uv$config) return;
		await loadScript('/uv/uv.bundle.js');
		await loadScript('/uv/uv.config.js');
		for (let i = 0; i < 50 && !(window as any).__uv$config; i++) {
			await new Promise((r) => setTimeout(r, 100));
		}
		if (!(window as any).__uv$config) throw new Error('service config failed to load');
	}

	// The wisp websocket endpoint (cloaked). Must match static/uv/uv.config.js and
	// the edge config. Uses wss:// on https, ws:// on http.
	function wispUrl(): string {
		const proto = location.protocol === 'https:' ? 'wss' : 'ws';
		return `${proto}://${location.host}/w/`;
	}

	// One-time setup: pick the Wisp transport via bare-mux BEFORE the UV service
	// worker is registered, then register the SW under the cloaked scope.
	let started: Promise<void> | null = null;
	function ensureReady(): Promise<void> {
		if (started) return started;
		const run = (async () => {
			if (!('serviceWorker' in navigator)) {
				throw new Error('service workers are not supported in this browser');
			}
			await loadUVConfig();
			const cfg = (window as any).__uv$config;

			// bare-mux + epoxy(Wisp) transport — set the transport first so the SW
			// has a live connection the instant it takes control. The specifier is
			// held in a variable + @vite-ignore so it stays a RUNTIME URL (served
			// from static/baremux/), not something the bundler/TS tries to resolve.
			const baremuxUrl = '/baremux/index.mjs';
			const baremux: any = await import(/* @vite-ignore */ baremuxUrl);
			const conn = new baremux.BareMuxConnection('/baremux/worker.js');
			await conn.setTransport('/epoxy/index.mjs', [{ wisp: wispUrl() }]);

			// Register the UV 3.x service worker under the cloaked scope (/edu/).
			const reg = await navigator.serviceWorker.register('/uv.js', { scope: cfg.prefix });
			// Wait for ACTIVATION. We can't use navigator.serviceWorker.ready because
			// this page is outside the SW scope, so `ready` never resolves here.
			if (!reg.active) {
				await new Promise<void>((resolve) => {
					const sw = reg.installing || reg.waiting;
					if (!sw) return resolve();
					const done = () => sw.state === 'activated' && resolve();
					sw.addEventListener('statechange', done);
					done();
				});
			}
		})();
		started = run.catch((e: any) => {
			started = null; // allow a retry
			error = 'Could not start the private browser: ' + (e?.message || e);
			throw e;
		});
		return started;
	}

	async function go(e?: Event) {
		e?.preventDefault();
		error = '';
		const url = toUrl(query);
		if (!url) return;
		try {
			await ensureReady();
		} catch {
			return;
		}
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
		ensureReady().catch(() => {
			/* surfaced via `error` */
		});
	});

	const quickLinks = [
		{ label: 'Google', url: 'https://google.com', icon: 'mdi:google' },
		{ label: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: 'simple-icons:duckduckgo' },
		{ label: 'YouTube', url: 'https://youtube.com', icon: 'mdi:youtube' },
		{ label: 'Wikipedia', url: 'https://wikipedia.org', icon: 'mdi:wikipedia' },
		{ label: 'Reddit', url: 'https://reddit.com', icon: 'mdi:reddit' },
		{ label: 'Snapchat', url: 'https://web.snapchat.com', icon: 'simple-icons:snapchat' },
		{ label: 'Discord', url: 'https://discord.com', icon: 'ic:baseline-discord' },
		{ label: 'Spotify', url: 'https://open.spotify.com', icon: 'mdi:spotify' }
	];
	function quick(url: string) {
		query = url;
		go();
	}
</script>

<svelte:head>
	<meta name="description" content="Browse the web freely and privately." />
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
					<h1 class="text-3xl font-black text-base-content"><Cloak text="Private Browser" /></h1>
					<p class="mx-auto mt-2 max-w-md text-base-content/70">
						Browse any site right here — search above or jump to a favorite. Traffic routes through {$page.url.hostname}'s own server.
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
					Heads up: this hides the destination from your network, but the site can still see it's being accessed. Don't use it for anything sensitive.
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
			title="Browser"
			class="h-full w-full border-0 {browsing ? 'block' : 'hidden'}"
			on:load={() => (loading = false)}
		></iframe>
	</div>
</div>
