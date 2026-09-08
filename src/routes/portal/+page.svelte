<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import Cloak from '$lib/components/Cloak.svelte';
	import { onMount } from 'svelte';

	const SERVER_IP = '51.81.210.201';
	$: host = $page.url.hostname;

	let domain = '';
	let submitting = false;
	let result: { ok: boolean; status: string; message: string; domain?: string } | null = null;

	let count = 0;
	onMount(async () => {
		try {
			const r = await fetch('/api/domains');
			if (r.ok) count = (await r.json()).count ?? 0;
		} catch {
			/* ignore */
		}
	});

	async function submit() {
		result = null;
		const d = domain.trim();
		if (!d) return;
		submitting = true;
		try {
			const r = await fetch('/api/domains', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ domain: d })
			});
			const data = await r.json();
			if (r.ok) {
				result = { ok: true, status: data.status, message: data.message, domain: data.domain };
				if (data.status === 'added') count += 1;
			} else {
				result = { ok: false, status: 'error', message: data.error || 'Something went wrong.' };
			}
		} catch {
			result = { ok: false, status: 'error', message: 'Network error — try again.' };
		} finally {
			submitting = false;
		}
	}

	// Live status checker
	let checkTarget = '';
	let checking = false;
	let checkResult: { registered: boolean; pointsAtUs: boolean; live: boolean } | null = null;
	async function checkStatus(d: string) {
		checkTarget = d;
		checking = true;
		checkResult = null;
		try {
			const r = await fetch('/api/domains?check=' + encodeURIComponent(d));
			if (r.ok) checkResult = await r.json();
		} catch {
			/* ignore */
		} finally {
			checking = false;
		}
	}

	const steps = [
		{
			icon: 'mdi:cart-outline',
			title: 'Get a domain',
			body: 'Grab any cheap domain (Namecheap, Porkbun, Cloudflare — often under $10/yr). Pick something that sounds harmless.'
		},
		{
			icon: 'mdi:dns-outline',
			title: 'Point it at us',
			body: `In your registrar's DNS settings, add an A record for “@” (and “www”) pointing to ${SERVER_IP}.`
		},
		{
			icon: 'mdi:rocket-launch-outline',
			title: 'Add it below',
			body: 'Enter your domain here. Within a minute it serves the full site — with automatic HTTPS. Free, forever.'
		}
	];
</script>

<svelte:head>
	<title>Add your domain — {host}</title>
	<meta name="description" content="Host your own mirror of the site on your own domain, free. Point DNS and go live in a minute." />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:py-16">
	<!-- Hero -->
	<div class="relative overflow-hidden rounded-3xl bg-neutral p-8 text-center text-white sm:p-14">
		<div class="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
			<Icon icon="mdi:web-plus" class="text-3xl" />
		</div>
		<h1 class="text-4xl font-black tracking-tight sm:text-5xl">Add your own link</h1>
		<p class="mx-auto mt-4 max-w-xl text-lg font-medium text-white/80">
			Blocked at school? Put the whole site on <em>your</em> domain. Point it at us and it goes live in about a
			minute — with HTTPS, totally free.
		</p>
		{#if count > 0}
			<div class="mx-auto mt-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
				<Icon icon="mdi:earth" class="text-lg text-[#FF9F1C]" />
				{count.toLocaleString()} community {count === 1 ? 'mirror' : 'mirrors'} online
			</div>
		{/if}
	</div>

	<!-- Steps -->
	<div class="mt-10 grid gap-5 sm:grid-cols-3">
		{#each steps as s, i}
			<div class="relative rounded-2xl bg-base-200 p-6">
				<div class="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
					<Icon icon={s.icon} class="text-2xl" />
				</div>
				<div class="absolute right-5 top-5 text-3xl font-black text-base-content/10">{i + 1}</div>
				<h3 class="text-lg font-black text-base-content">{s.title}</h3>
				<p class="mt-1 text-sm leading-relaxed text-base-content/70">{s.body}</p>
			</div>
		{/each}
	</div>

	<!-- DNS record helper -->
	<div class="mt-6 rounded-2xl border border-base-300 bg-base-100 p-5">
		<div class="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-base-content/50">
			<Icon icon="mdi:table" /> The DNS record to add
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="text-xs uppercase tracking-wider text-base-content/50">
					<tr>
						<th class="pb-2 pr-6 font-bold">Type</th>
						<th class="pb-2 pr-6 font-bold">Host</th>
						<th class="pb-2 font-bold">Value</th>
					</tr>
				</thead>
				<tbody class="font-mono font-semibold text-base-content">
					<tr><td class="py-1 pr-6">A</td><td class="py-1 pr-6">@</td><td class="py-1">{SERVER_IP}</td></tr>
					<tr><td class="py-1 pr-6">A</td><td class="py-1 pr-6">www</td><td class="py-1">{SERVER_IP}</td></tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Add form -->
	<form class="mt-8 rounded-2xl bg-base-200 p-6" on:submit|preventDefault={submit}>
		<label class="mb-2 block text-lg font-black text-base-content" for="domain-input">Your domain</label>
		<div class="flex flex-col gap-3 sm:flex-row">
			<input
				id="domain-input"
				bind:value={domain}
				placeholder="myschoolgames.com"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				class="flex-1 rounded-xl border border-base-300 bg-base-100 px-4 py-3 font-mono text-base-content outline-none focus:border-primary"
			/>
			<button
				type="submit"
				disabled={submitting || !domain.trim()}
				class="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-black text-white transition hover:brightness-110 disabled:opacity-50"
			>
				{#if submitting}
					<Icon icon="mdi:loading" class="animate-spin text-xl" /> Adding…
				{:else}
					<Icon icon="mdi:plus" class="text-xl" /> Add it
				{/if}
			</button>
		</div>

		{#if result}
			<div
				class="mt-4 flex items-start gap-3 rounded-xl p-4 text-sm font-semibold {result.ok
					? 'bg-success/15 text-success'
					: 'bg-error/15 text-error'}"
			>
				<Icon icon={result.ok ? 'mdi:check-circle' : 'mdi:alert-circle'} class="mt-0.5 shrink-0 text-lg" />
				<div>
					<p>{result.message}</p>
					{#if result.ok && result.domain}
						<button
							type="button"
							class="mt-2 inline-flex items-center gap-1 rounded-lg bg-base-100 px-3 py-1.5 text-xs font-bold text-base-content hover:bg-base-300"
							on:click={() => checkStatus(result?.domain || '')}
						>
							<Icon icon="mdi:radar" /> Check if it’s live
						</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if checking || checkResult}
			<div class="mt-3 rounded-xl border border-base-300 bg-base-100 p-4 text-sm">
				{#if checking}
					<span class="flex items-center gap-2 text-base-content/60"><Icon icon="mdi:loading" class="animate-spin" /> Checking {checkTarget}…</span>
				{:else if checkResult}
					<div class="space-y-1.5">
						<div class="flex items-center gap-2">
							<Icon icon={checkResult.registered ? 'mdi:check-circle' : 'mdi:circle-outline'} class="{checkResult.registered ? 'text-success' : 'text-base-content/40'}" />
							<span class="font-semibold">Registered with us</span>
						</div>
						<div class="flex items-center gap-2">
							<Icon icon={checkResult.pointsAtUs ? 'mdi:check-circle' : 'mdi:circle-outline'} class="{checkResult.pointsAtUs ? 'text-success' : 'text-base-content/40'}" />
							<span class="font-semibold">DNS points at our server</span>
							{#if !checkResult.pointsAtUs}<span class="text-base-content/50">— add the A record above (can take a few minutes)</span>{/if}
						</div>
						{#if checkResult.live}
							<p class="mt-2 flex items-center gap-2 font-black text-success"><Icon icon="mdi:party-popper" /> It’s live! Open it in a new tab.</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<p class="mt-4 flex items-start gap-2 text-xs leading-relaxed text-base-content/50">
			<Icon icon="mdi:information-outline" class="mt-0.5 shrink-0" />
			Only add domains you own. HTTPS is issued automatically the first time someone visits. DNS changes can take a
			few minutes to spread. Keep it legal — no illegal or abusive content.
		</p>
	</form>
</div>
