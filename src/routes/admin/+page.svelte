<script lang="ts">
	// Owner-only admin dashboard. Password is verified server-side against ADMIN_PASSWORD
	// (env) — nothing sensitive is hardcoded here.
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';

	let password = '';
	let stats: any = null;
	let party: any = null;
	let error = '';
	let loading = false;

	async function login() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/admin/stats', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});
			const j = await res.json();
			if (!res.ok || !j.success) throw new Error(j.error || 'Login failed');
			stats = j.stats;
			party = j.party;
		} catch (e: any) {
			error = e.message || 'Login failed';
		} finally {
			loading = false;
		}
	}

	const STAT_TILES = (s: any, p: any) => [
		{ label: 'AI games', value: s.aiGames, icon: 'mdi:robot' },
		{ label: 'Storage (MB)', value: s.totalStorageMB, icon: 'mdi:database' },
		{ label: 'Players', value: s.players, icon: 'mdi:account-group' },
		{ label: 'Posts', value: s.posts, icon: 'mdi:message-text' },
		{ label: 'Wallets', value: s.wallets, icon: 'mdi:wallet' },
		{ label: 'Coins in circ.', value: s.coinsInCirculation, icon: 'mdi:hand-coin' },
		{ label: 'Shop items', value: s.shopItems, icon: 'mdi:storefront' },
		{ label: 'Shop sales', value: s.shopSales, icon: 'mdi:cart' },
		{ label: 'Market assets', value: s.marketAssets, icon: 'mdi:chart-line' },
		{ label: 'Market invested', value: s.marketInvested, icon: 'mdi:cash-multiple' },
		{ label: 'Live rooms', value: p?.rooms ?? '—', icon: 'mdi:account-multiple' },
		{ label: 'Dictionary', value: p?.words ?? '—', icon: 'mdi:book-open-variant' }
	];
</script>

<svelte:head><title>Admin — {config.branding.name}</title></svelte:head>

<div class="min-h-screen bg-base-200">
	<div class="mx-auto max-w-4xl px-4 py-8">
		{#if !stats}
			<div class="mx-auto max-w-sm rounded-3xl bg-base-100 p-8 shadow-xl">
				<h1 class="mb-1 flex items-center gap-2 text-2xl font-black text-base-content"><Icon icon="mdi:shield-lock" class="text-primary" /> Admin</h1>
				<p class="mb-5 text-sm text-base-content/60">Enter the admin password to view server stats.</p>
				<input class="input input-bordered mb-3 w-full" type="password" placeholder="Password" bind:value={password} on:keydown={(e) => e.key === 'Enter' && login()} />
				{#if error}<p class="mb-3 text-sm font-bold text-error">{error}</p>{/if}
				<button class="w-full rounded-xl bg-primary py-3 font-bold text-white hover:brightness-110 disabled:opacity-50" on:click={login} disabled={loading || !password}>{loading ? '…' : 'View stats'}</button>
			</div>
		{:else}
			<div class="mb-5 flex items-center justify-between">
				<h1 class="flex items-center gap-2 text-2xl font-black text-base-content"><Icon icon="mdi:view-dashboard" class="text-primary" /> Server stats</h1>
				<button class="rounded-full bg-base-100 px-4 py-2 text-sm font-bold text-base-content shadow hover:bg-base-300" on:click={login}><Icon icon="mdi:refresh" /> Refresh</button>
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				{#each STAT_TILES(stats, party) as t}
					<div class="flex flex-col gap-1 rounded-2xl bg-base-100 p-4 shadow">
						<Icon icon={t.icon} class="text-2xl text-primary" />
						<div class="text-2xl font-black text-base-content">{typeof t.value === 'number' ? t.value.toLocaleString() : t.value}</div>
						<div class="text-xs font-bold uppercase tracking-wider text-base-content/50">{t.label}</div>
					</div>
				{/each}
			</div>

			<div class="mt-6 grid gap-4 md:grid-cols-2">
				<div class="rounded-2xl bg-base-100 p-4 shadow">
					<h2 class="mb-3 font-black text-base-content">Top streaks</h2>
					<div class="flex flex-col divide-y divide-base-200">
						{#each stats.topStreaks as r, i}
							<div class="flex items-center justify-between py-2 text-sm">
								<span class="font-semibold text-base-content">{i + 1}. {r.name}</span>
								<span class="flex items-center gap-1 font-bold text-primary"><Icon icon="mdi:fire" /> {r.streak}</span>
							</div>
						{:else}
							<p class="py-2 text-sm text-base-content/50">No players yet.</p>
						{/each}
					</div>
				</div>
				<div class="rounded-2xl bg-base-100 p-4 shadow">
					<h2 class="mb-3 font-black text-base-content">Recent games</h2>
					<div class="flex flex-col divide-y divide-base-200">
						{#each stats.recentGames as g}
							<a href={`/ai/user-g/${g.id}`} class="flex items-center justify-between gap-2 py-2 text-sm hover:text-primary">
								<span class="truncate font-semibold text-base-content">{g.title}</span>
								<span class="flex-none text-xs text-base-content/50">{g.creatorName || 'Anon'}{#if g.source === 'upload'} · upload{/if}</span>
							</a>
						{:else}
							<p class="py-2 text-sm text-base-content/50">No games yet.</p>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
