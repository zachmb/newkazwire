<script lang="ts">
	// KazMarket — a "stock market" for games, AI creations and posts (Giggles-style).
	// Invest Kazcoins early; if others pile in after you, the price rises and you profit.
	// Extracted from /market so it can also live inside the account Shop tab.
	// Mobbin ref: Robinhood watchlist/holdings + sparkline rows (https://mobbin.com/apps/robinhood-ios).
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';
	import { getUid, getPlayerName, setPlayerName, hasPlayerName } from '$lib/utils/streak';
	import { games } from '$lib/data/games';
	import StockChart from '$lib/components/StockChart.svelte';

	// When embedded (e.g. the account Shop tab) skip reading deep-link ?asset= params.
	export let embedded = false;

	let uid = '';
	let coins = 0;
	let assets: any[] = [];
	let positions: any[] = [];
	let loading = true;

	let toast = '';
	let toastKind: 'success' | 'error' = 'success';
	let toastTimer: ReturnType<typeof setTimeout>;
	function showToast(m: string, k: 'success' | 'error' = 'success') {
		toast = m; toastKind = k; clearTimeout(toastTimer); toastTimer = setTimeout(() => (toast = ''), 3200);
	}

	// Trade modal
	let trade: any = null; // { assetId, kind, title, action, price }
	let tradeAmount: number | null = null;
	let trading = false;

	// Invest picker (list a new asset)
	let showPicker = false;
	let pickerQuery = '';
	let aiGames: any[] = [];
	$: libraryAssets = games.map((g: any) => ({ assetId: `game:${g.href.split('/').pop()}`, kind: 'game', title: g.title }));
	$: pickerResults = [
		...aiGames.map((g) => ({ assetId: `ai:${g.id}`, kind: 'ai', title: g.title })),
		...libraryAssets
	].filter((a: any) => !pickerQuery || a.title.toLowerCase().includes(pickerQuery.toLowerCase())).slice(0, 60);

	async function load() {
		loading = true;
		try {
			const [mr, pr] = await Promise.all([
				fetch('/api/market').then((r) => r.json()),
				fetch(`/api/market/portfolio?uid=${encodeURIComponent(uid)}`).then((r) => r.json())
			]);
			assets = mr.assets || [];
			coins = pr.coins || 0;
			positions = pr.positions || [];
		} catch { /* offline */ } finally { loading = false; }
	}

	function ensureName(): boolean {
		if (hasPlayerName()) return true;
		const n = (prompt('Pick a display name to trade:') || '').trim();
		if (!n) return false;
		setPlayerName(n);
		return true;
	}

	function openTrade(a: any, action: 'buy' | 'sell') {
		trade = { assetId: a.id || a.assetId, kind: a.kind, title: a.title, action, price: a.price };
		tradeAmount = null;
	}

	async function confirmTrade() {
		if (!trade || !tradeAmount || tradeAmount <= 0) return;
		if (!ensureName()) return;
		trading = true;
		try {
			const res = await fetch('/api/market/trade', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid, assetId: trade.assetId, kind: trade.kind, title: trade.title, action: trade.action, amount: tradeAmount })
			});
			const j = await res.json();
			if (!res.ok || !j.success) { if (typeof j.balance === 'number') coins = j.balance; throw new Error(j.error || 'Trade failed'); }
			coins = j.balance;
			showToast(trade.action === 'buy' ? `Bought ${j.shares} shares of ${trade.title}` : `Sold ${j.shares} shares of ${trade.title}`);
			trade = null;
			await load();
		} catch (e: any) { showToast(e.message || 'Trade failed', 'error'); } finally { trading = false; }
	}

	// The "KazMarket Index" (S&P-style composite): each asset's history normalized to a
	// base of 100 at its start, then averaged across assets at each step (shorter series
	// hold their last value). Gives one market-wide index curve.
	$: indexValues = (() => {
		const series = (assets || [])
			.map((a) => (a.history || []).map((h: any) => h.p))
			.filter((s: number[]) => s.length >= 2 && s[0] > 0);
		if (!series.length) return [] as number[];
		const norm = series.map((s: number[]) => s.map((p) => (p / s[0]) * 100));
		const maxLen = Math.max(...norm.map((s: number[]) => s.length));
		const out: number[] = [];
		for (let i = 0; i < maxLen; i++) {
			const vals = norm.map((s: number[]) => s[Math.min(i, s.length - 1)]);
			out.push(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
		}
		return out;
	})();
	$: indexChange = indexValues.length >= 2 ? indexValues[indexValues.length - 1] - indexValues[0] : 0;

	const portfolioValue = () => positions.reduce((s, p) => s + p.value, 0);
	const portfolioCost = () => positions.reduce((s, p) => s + p.cost, 0);

	async function loadAi() {
		try { const j = await (await fetch('/api/ai/gallery')).json(); aiGames = (j.games || []).slice(0, 30); } catch { /* */ }
	}

	let dailyClaimed = false;
	async function claimDaily() {
		try {
			const r = await fetch('/api/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid }) });
			const j = await r.json();
			if (j.success && j.claimed) { coins = j.coins; showToast(`Daily bonus: +${j.amount} Kazcoins!`); }
			else { coins = j.coins ?? coins; showToast('Daily bonus already claimed today.', 'error'); }
			dailyClaimed = true;
		} catch { showToast('Could not claim bonus', 'error'); }
	}

	onMount(async () => {
		uid = getUid();
		await Promise.all([load(), loadAi()]);
		if (embedded) return;
		// Deep-link: /market?asset=game:ID&kind=game&title=... opens the invest modal.
		const sp = $page.url.searchParams;
		const assetId = sp.get('asset');
		if (assetId) {
			const kind = (sp.get('kind') as any) || 'game';
			const title = sp.get('title') || assetId;
			const existing = assets.find((a) => a.id === assetId);
			openTrade({ id: assetId, kind, title, price: existing?.price ?? 5 }, 'buy');
		}
	});
</script>

<div class="flex flex-col gap-5">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="flex items-center gap-2 text-2xl font-black tracking-tight text-base-content sm:text-3xl">
				<Icon icon="mdi:chart-line" class="text-primary" /> KazMarket
			</h1>
			<p class="mt-1 text-sm text-base-content/60">Invest Kazcoins in games, creations & posts. Get in early — if they take off, so does your stake.</p>
		</div>
		<div class="flex items-center gap-2">
			<div class="flex items-center gap-2 rounded-full bg-warning/15 px-4 py-2 font-black text-warning"><Icon icon="mdi:hand-coin" /> {coins.toLocaleString()}</div>
			<button class="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-2 text-sm font-bold text-success transition hover:bg-success hover:text-white disabled:opacity-50" on:click={claimDaily} disabled={dailyClaimed} title="Claim your daily bonus">
				<Icon icon="mdi:gift" /> <span class="hidden sm:inline">Daily</span>
			</button>
			<button class="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:brightness-110" on:click={() => (showPicker = !showPicker)}>
				<Icon icon="mdi:plus" /> Invest
			</button>
		</div>
	</div>

	<!-- Invest picker -->
	{#if showPicker}
		<div class="flex flex-col gap-2 rounded-2xl bg-base-200 p-3 ring-1 ring-base-300">
			<input class="input input-bordered w-full" placeholder="Search games & creations to invest in…" bind:value={pickerQuery} />
			<div class="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
				{#each pickerResults as a (a.assetId)}
					<button class="flex items-center gap-2 rounded-xl bg-base-100 p-2 text-left transition hover:ring-2 hover:ring-primary" on:click={() => { showPicker = false; openTrade({ ...a, price: 10 }, 'buy'); }}>
						<Icon icon={a.kind === 'ai' ? 'mdi:robot-happy' : 'mdi:gamepad-variant'} class="flex-none text-lg text-primary" />
						<span class="truncate text-sm font-semibold text-base-content">{a.title}</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- KazMarket Index — S&P-style composite chart -->
	{#if indexValues.length >= 2}
		<div class="rounded-2xl bg-base-200 p-4 ring-1 ring-base-300">
			<div class="mb-2 flex items-end justify-between">
				<div>
					<div class="text-xs font-bold uppercase tracking-wider text-base-content/50">KazMarket Index</div>
					<div class="text-2xl font-black text-base-content">{indexValues[indexValues.length - 1].toFixed(1)}</div>
				</div>
				<div class="text-right text-sm font-bold {indexChange >= 0 ? 'text-success' : 'text-error'}">
					{indexChange >= 0 ? '▲' : '▼'} {Math.abs(indexChange).toFixed(1)} ({(indexChange).toFixed(1)}%)
					<div class="text-xs font-medium text-base-content/40">since inception (base 100)</div>
				</div>
			</div>
			<StockChart values={indexValues} height={200} />
		</div>
	{/if}

	<!-- Portfolio -->
	{#if positions.length}
		{@const val = portfolioValue()}
		{@const cost = portfolioCost()}
		{@const pl = val - cost}
		<div class="rounded-2xl bg-base-200 p-4 ring-1 ring-base-300">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="flex items-center gap-2 font-black text-base-content"><Icon icon="mdi:briefcase" class="text-primary" /> Your portfolio</h2>
				<div class="text-right">
					<div class="font-black text-base-content">{val.toLocaleString()} <span class="text-xs font-bold text-base-content/50">value</span></div>
					<div class="text-xs font-bold {pl >= 0 ? 'text-success' : 'text-error'}">{pl >= 0 ? '▲' : '▼'} {Math.abs(pl).toLocaleString()} ({cost > 0 ? Math.round((pl / cost) * 100) : 0}%)</div>
				</div>
			</div>
			<div class="flex flex-col divide-y divide-base-300">
				{#each positions as p (p.assetId)}
					{@const ppl = p.value - p.cost}
					<div class="flex items-center gap-3 py-2">
						<Icon icon={p.kind === 'ai' ? 'mdi:robot-happy' : p.kind === 'post' ? 'mdi:message-text' : 'mdi:gamepad-variant'} class="flex-none text-lg text-primary" />
						<div class="min-w-0 flex-1"><div class="truncate font-bold text-base-content">{p.title}</div><div class="text-xs text-base-content/50">{p.shares} shares · avg {p.cost > 0 && p.shares > 0 ? Math.round((p.cost / p.shares) * 100) / 100 : 0}</div></div>
						<div class="text-right"><div class="font-bold text-base-content">{p.value.toLocaleString()}</div><div class="text-xs font-bold {ppl >= 0 ? 'text-success' : 'text-error'}">{ppl >= 0 ? '+' : ''}{ppl.toLocaleString()}</div></div>
						<button class="rounded-full bg-base-300 px-3 py-1.5 text-xs font-bold text-base-content hover:bg-error hover:text-white" on:click={() => openTrade({ id: p.assetId, kind: p.kind, title: p.title, price: p.price }, 'sell')}>Sell</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Market list -->
	<div class="flex flex-col gap-2">
		<h2 class="px-1 font-black text-base-content">Trending</h2>
		{#if loading}
			{#each Array(5) as _}<div class="h-16 animate-pulse rounded-2xl bg-base-200"></div>{/each}
		{:else if assets.length === 0}
			<div class="flex flex-col items-center gap-2 rounded-2xl bg-base-200 p-10 text-center">
				<Icon icon="mdi:chart-line-variant" class="text-5xl text-base-content/30" />
				<p class="font-bold text-base-content">No assets yet</p>
				<p class="text-sm text-base-content/60">Be the first to invest — tap "Invest" and back a game you believe in.</p>
			</div>
		{:else}
			{#each assets as a (a.id)}
				<div class="flex items-center gap-3 rounded-2xl bg-base-200 p-3 ring-1 ring-base-300">
					<Icon icon={a.kind === 'ai' ? 'mdi:robot-happy' : a.kind === 'post' ? 'mdi:message-text' : 'mdi:gamepad-variant'} class="flex-none text-xl text-primary" />
					<div class="min-w-0 flex-1">
						<div class="truncate font-bold text-base-content">{a.title}</div>
						<div class="text-xs text-base-content/50">{a.invested.toLocaleString()} invested</div>
					</div>
					<div class="hidden w-32 flex-none sm:block">
						<StockChart values={(a.history || []).map((h: any) => h.p)} height={40} showGrid={false} />
					</div>
					<div class="w-20 flex-none text-right">
						<div class="font-black text-base-content">{a.price}</div>
						<div class="text-xs font-bold {a.change >= 0 ? 'text-success' : 'text-error'}">{a.change >= 0 ? '▲' : '▼'} {Math.abs(a.change)}%</div>
					</div>
					<button class="flex-none rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:brightness-110" on:click={() => openTrade(a, 'buy')}>Invest</button>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Trade modal -->
{#if trade}
	<div class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" on:click={() => (trade = null)} on:keydown role="button" tabindex="0">
		<div class="w-full max-w-sm rounded-3xl bg-base-100 p-6 shadow-2xl" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-modal="true" tabindex="-1">
			<h3 class="mb-1 text-xl font-black text-base-content">{trade.action === 'buy' ? 'Invest in' : 'Sell'} {trade.title}</h3>
			{#if (assets.find((a) => a.id === trade.assetId)?.history || []).length >= 2}
				<div class="mb-3 rounded-xl bg-base-200 p-2">
					<StockChart values={(assets.find((a) => a.id === trade.assetId)?.history || []).map((h: any) => h.p)} height={120} />
				</div>
			{/if}
			<p class="mb-4 text-sm text-base-content/60">Current price <span class="font-bold text-base-content">{trade.price}</span> / share · you have <span class="font-bold text-warning">{coins.toLocaleString()}</span> coins</p>
			<label class="mb-4 flex flex-col gap-1">
				<span class="text-xs font-bold uppercase tracking-wider text-base-content/50">{trade.action === 'buy' ? 'Kazcoins to invest' : 'Shares to sell'}</span>
				<input class="input input-bordered w-full" type="number" min="1" bind:value={tradeAmount} placeholder={trade.action === 'buy' ? 'e.g. 50' : 'e.g. 3'} />
			</label>
			<div class="flex gap-2">
				<button class="flex-1 rounded-xl bg-base-200 py-3 font-bold text-base-content hover:bg-base-300" on:click={() => (trade = null)}>Cancel</button>
				<button class="flex-1 rounded-xl bg-primary py-3 font-bold text-white hover:brightness-110 disabled:opacity-50" on:click={confirmTrade} disabled={trading || !tradeAmount}>{trading ? '…' : trade.action === 'buy' ? 'Invest' : 'Sell'}</button>
			</div>
		</div>
	</div>
{/if}

{#if toast}
	<div class="pointer-events-none fixed inset-x-0 bottom-6 z-[2000] flex justify-center px-4">
		<div class="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl {toastKind === 'success' ? 'bg-primary' : 'bg-error'}" role="status">
			<Icon icon={toastKind === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} class="text-lg" /> {toast}
		</div>
	</div>
{/if}
