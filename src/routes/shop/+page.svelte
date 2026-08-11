<script lang="ts">
	// Item shop — a player-run marketplace in virtual Kazcoins. Players earn coins by
	// playing games (streak pings), list their own items, and buy each other's; the
	// seller earns the coins. All balances/purchases are server-authoritative.
	// Mobbin ref: Roblox "Avatar Shop" / Discord shop grid — card grid with price pills
	// and a prominent balance chip (https://mobbin.com/apps/roblox-ios).
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { getUid, getPlayerName, setPlayerName, hasPlayerName } from '$lib/utils/streak';
	import { config } from '$lib/config';

	let coins = 0;
	let items: any[] = [];
	let loading = true;
	let uid = '';
	let playerName = '';

	// toast
	let toast = '';
	let toastKind: 'success' | 'error' = 'success';
	let toastTimer: ReturnType<typeof setTimeout>;
	function showToast(msg: string, kind: 'success' | 'error' = 'success') {
		toast = msg;
		toastKind = kind;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 3200);
	}

	// list-an-item form
	let showList = false;
	let fTitle = '';
	let fDesc = '';
	let fPrice: number | null = null;
	let fIcon = 'mdi:package-variant';
	let listing = false;
	const ICONS = ['mdi:package-variant', 'mdi:crown', 'mdi:star-four-points', 'mdi:sword', 'mdi:ghost', 'mdi:rocket', 'mdi:diamond-stone', 'mdi:controller-classic'];

	let buyingId = '';

	async function loadWallet() {
		try {
			const r = await fetch(`/api/wallet?uid=${encodeURIComponent(uid)}`);
			const j = await r.json();
			if (j.success) coins = j.coins;
		} catch {
			/* non-critical */
		}
	}

	async function loadShop() {
		loading = true;
		try {
			const r = await fetch('/api/shop');
			const j = await r.json();
			items = j.items || [];
		} catch {
			items = [];
		} finally {
			loading = false;
		}
	}

	function ensureName(): boolean {
		if (hasPlayerName()) return true;
		const n = (prompt('Pick a display name to trade in the shop:') || '').trim();
		if (!n) return false;
		setPlayerName(n);
		playerName = n;
		return true;
	}

	async function buy(item: any) {
		if (item.sellerUid === uid) return showToast('You cannot buy your own item.', 'error');
		if (!ensureName()) return;
		buyingId = item.id;
		try {
			const r = await fetch('/api/shop/buy', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid, itemId: item.id })
			});
			const j = await r.json();
			if (!r.ok || !j.success) {
				if (typeof j.balance === 'number') coins = j.balance;
				throw new Error(j.error || 'Purchase failed');
			}
			coins = j.balance;
			item.soldCount = (item.soldCount || 0) + 1;
			items = items;
			showToast(`Bought "${item.title}"! ${coins} coins left`);
		} catch (e: any) {
			showToast(e.message || 'Purchase failed', 'error');
		} finally {
			buyingId = '';
		}
	}

	async function submitListing() {
		if (!ensureName()) return;
		if (!fTitle.trim()) return showToast('Give your item a title.', 'error');
		if (!fPrice || fPrice < 1) return showToast('Set a price of at least 1 coin.', 'error');
		listing = true;
		try {
			const r = await fetch('/api/shop', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid, sellerName: playerName, title: fTitle, description: fDesc, price: fPrice, icon: fIcon })
			});
			const j = await r.json();
			if (!r.ok || !j.success) throw new Error(j.error || 'Could not list item');
			items = [j.item, ...items];
			showList = false;
			fTitle = '';
			fDesc = '';
			fPrice = null;
			fIcon = 'mdi:package-variant';
			showToast('Item listed!');
		} catch (e: any) {
			showToast(e.message || 'Could not list item', 'error');
		} finally {
			listing = false;
		}
	}

	onMount(async () => {
		uid = getUid();
		playerName = getPlayerName();
		await Promise.all([loadWallet(), loadShop()]);
	});
</script>

<svelte:head>
	<title>Item Shop — {config.branding.name}</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<div class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
		<!-- Header + balance -->
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-black tracking-tight text-base-content sm:text-3xl">
					<Icon icon="mdi:storefront" class="text-primary" /> Item Shop
				</h1>
				<p class="mt-1 text-sm text-base-content/60">Earn Kazcoins by playing. List your own items and earn from other players.</p>
			</div>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2 rounded-full bg-warning/15 px-4 py-2 text-lg font-black text-warning">
					<Icon icon="mdi:hand-coin" /> {coins.toLocaleString()}
				</div>
				<button class="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-110" on:click={() => (showList = !showList)}>
					<Icon icon="mdi:plus" /> List an item
				</button>
			</div>
		</div>

		<!-- List form -->
		{#if showList}
			<div class="flex flex-col gap-3 rounded-2xl bg-base-200 p-5 ring-1 ring-base-300">
				<h2 class="text-lg font-black text-base-content">List a new item</h2>
				<div class="flex flex-wrap gap-2">
					{#each ICONS as ic}
						<button class="grid h-11 w-11 place-items-center rounded-xl text-xl transition {fIcon === ic ? 'bg-primary text-white' : 'bg-base-100 text-base-content hover:bg-base-300'}" on:click={() => (fIcon = ic)} aria-label="Pick icon">
							<Icon icon={ic} />
						</button>
					{/each}
				</div>
				<input class="input input-bordered w-full" placeholder="Item title (e.g. Gold Crown flair)" maxlength="60" bind:value={fTitle} />
				<textarea class="textarea textarea-bordered w-full" placeholder="Description (optional)" maxlength="240" rows="2" bind:value={fDesc}></textarea>
				<div class="flex items-center gap-3">
					<label class="flex items-center gap-2 rounded-xl bg-base-100 px-3 py-2 ring-1 ring-base-300">
						<Icon icon="mdi:hand-coin" class="text-warning" />
						<input class="w-28 bg-transparent font-bold focus:outline-none" type="number" min="1" placeholder="Price" bind:value={fPrice} />
					</label>
					<button class="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50" on:click={submitListing} disabled={listing}>
						{listing ? 'Listing…' : 'List item'}
					</button>
				</div>
			</div>
		{/if}

		<!-- Grid -->
		{#if loading}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each Array(8) as _}
					<div class="h-44 animate-pulse rounded-2xl bg-base-200"></div>
				{/each}
			</div>
		{:else if items.length === 0}
			<div class="flex flex-col items-center gap-3 rounded-2xl bg-base-200 p-10 text-center">
				<Icon icon="mdi:storefront-outline" class="text-5xl text-base-content/30" />
				<p class="font-bold text-base-content">The shop is empty</p>
				<p class="text-sm text-base-content/60">Be the first to list an item for other players to buy.</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
				{#each items as item (item.id)}
					<div class="flex flex-col gap-2 rounded-2xl bg-base-200 p-4 ring-1 ring-base-300 transition hover:ring-primary">
						<div class="grid h-16 w-16 place-items-center self-center rounded-2xl bg-primary/10 text-4xl text-primary">
							<Icon icon={item.icon || 'mdi:package-variant'} />
						</div>
						<h3 class="truncate text-center font-black text-base-content" title={item.title}>{item.title}</h3>
						{#if item.description}<p class="line-clamp-2 text-center text-xs text-base-content/60">{item.description}</p>{/if}
						<a href={`/u/${item.sellerUid}`} class="truncate text-center text-xs font-semibold text-base-content/50 hover:text-primary">by {item.sellerName}</a>
						<div class="mt-auto flex items-center justify-between gap-1 pt-1">
							<span class="flex items-center gap-1 font-black text-warning"><Icon icon="mdi:hand-coin" /> {item.price}</span>
							<button
								class="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
								on:click={() => buy(item)}
								disabled={buyingId === item.id || item.sellerUid === uid}
							>
								{item.sellerUid === uid ? 'Yours' : buyingId === item.id ? '…' : 'Buy'}
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if toast}
		<div class="pointer-events-none fixed inset-x-0 bottom-6 z-[2000] flex justify-center px-4">
			<div class="pointer-events-auto flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl {toastKind === 'success' ? 'bg-primary' : 'bg-error'}" role="status">
				<Icon icon={toastKind === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} class="text-lg" />
				{toast}
			</div>
		</div>
	{/if}
</div>
