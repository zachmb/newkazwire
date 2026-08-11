<!--
  /feed — TikTok-style vertical swipe feed for browsing games one-per-screen.

  Mobbin reference (design source): TikTok "Watching videos" flow (iOS)
  https://mobbin.com/flows/c7203035-45cc-4ed9-aeb7-73626b6f6b4d
  Full-bleed cover, bottom scrim + text stack, snap-y snap-mandatory paging.

  Covers BOTH the AI community games (/api/ai/gallery) and the main library
  ($lib/data/games). AI games are surfaced prominently (front-loaded, then
  interleaved). Degrades gracefully if the gallery fetch fails.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';
	import { games as libraryGames } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import FeedSlide from '$lib/components/Feed/FeedSlide.svelte';

	type FeedItem = {
		kind: 'ai' | 'library';
		title: string;
		image: string;
		href: string;
		creatorName: string;
		creatorLocation?: string;
		rating: number;
		chip: string;
	};

	type PublicUserGame = {
		id: string;
		title: string;
		creatorName?: string;
		creatorLocation?: string;
		coverUrl?: string;
		avgRating?: number;
	};

	// Deterministic pseudo-rating for library games (no rating field in data).
	// Stable per title so the same game always shows the same stars.
	function libRating(title: string): number {
		let h = 0;
		for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
		return 4.1 + (h % 9) / 10; // 4.1 .. 4.9
	}

	function mapLibrary(g: (typeof libraryGames)[number]): FeedItem {
		const tag = Array.isArray(g.tags) && g.tags.length ? g.tags[0] : 'Game';
		return {
			kind: 'library',
			title: g.title,
			image: getCDNImageUrl(g.image),
			href: g.href,
			creatorName: 'Kazwire',
			rating: libRating(g.title),
			chip: tag
		};
	}

	function mapAi(g: PublicUserGame): FeedItem {
		return {
			kind: 'ai',
			title: g.title || 'Untitled',
			image: g.coverUrl || '',
			href: `/ai/user-g/${g.id}`,
			creatorName: g.creatorName || 'Anonymous',
			creatorLocation: g.creatorLocation,
			rating: typeof g.avgRating === 'number' && g.avgRating > 0 ? g.avgRating : 4.5,
			chip: 'AI'
		};
	}

	// Interleave: lead with a few AI games (surfaced prominently), then weave the
	// rest of the AI games through the library so both are always in view.
	function build(ai: FeedItem[], lib: FeedItem[]): FeedItem[] {
		if (!ai.length) return lib;
		const LEAD = Math.min(3, ai.length);
		const lead = ai.slice(0, LEAD);
		const restAi = ai.slice(LEAD);
		const out: FeedItem[] = [...lead];
		let ai_i = 0;
		for (let i = 0; i < lib.length; i++) {
			out.push(lib[i]);
			// Sprinkle a remaining AI game every ~4 library games.
			if (i % 4 === 3 && ai_i < restAi.length) out.push(restAi[ai_i++]);
		}
		while (ai_i < restAi.length) out.push(restAi[ai_i++]);
		return out;
	}

	const libItems: FeedItem[] = libraryGames.map(mapLibrary);

	let items = $state<FeedItem[]>(libItems);
	let current = $state(0);
	let loadingAi = $state(true);
	let container = $state<HTMLDivElement | null>(null);

	// The global layout renders a static Nav above <main>, so the feed's usable
	// height is the viewport minus however far <main> is pushed down (varies by
	// breakpoint: ~106px mobile, ~65px desktop). Measure it at runtime so each
	// slide fills exactly the space under the nav — no double scrollbar, and the
	// nav stays visible/usable so users can navigate away.
	let navOffset = $state(0);
	function measureNav() {
		const main = container?.closest('main');
		navOffset = main ? Math.round(main.getBoundingClientRect().top) : 0;
	}

	// Render window: only mount current +/- 1 slides for perf on long feeds.
	function inWindow(i: number): boolean {
		return Math.abs(i - current) <= 1;
	}

	onMount(() => {
		let cancelled = false;
		measureNav();
		window.addEventListener('resize', measureNav);

		// The global layout appends a Footer below <main>, which would leave the
		// document taller than the viewport and produce a second (outer) scrollbar
		// competing with the feed's snap scroller. Lock the page scroll while the
		// feed is mounted so the snap container is the ONLY scroller; restore on
		// unmount so every other route behaves normally.
		const prevBody = document.body.style.overflow;
		const prevHtml = document.documentElement.style.overflow;
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
		(async () => {
			try {
				const res = await fetch('/api/ai/gallery');
				if (!res.ok) throw new Error(`gallery ${res.status}`);
				const data = await res.json();
				const aiGames: PublicUserGame[] = Array.isArray(data?.games) ? data.games : [];
				const aiItems = aiGames.map(mapAi).filter((g) => g.image);
				if (!cancelled && aiItems.length) {
					items = build(aiItems, libItems);
				}
			} catch (e) {
				// Degrade gracefully — library-only feed already rendered.
				console.warn('Feed: AI gallery unavailable, showing library only.', e);
			} finally {
				if (!cancelled) loadingAi = false;
			}
		})();
		return () => {
			cancelled = true;
			window.removeEventListener('resize', measureNav);
			document.body.style.overflow = prevBody;
			document.documentElement.style.overflow = prevHtml;
		};
	});

	function scrollToIndex(i: number) {
		const next = Math.max(0, Math.min(items.length - 1, i));
		const el = container?.children?.[next] as HTMLElement | undefined;
		el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function go(delta: number) {
		scrollToIndex(current + delta);
	}

	// Track which slide is centered via IntersectionObserver.
	let observer: IntersectionObserver | null = null;
	$effect(() => {
		if (!container) return;
		observer?.disconnect();
		observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting && e.intersectionRatio > 0.6) {
						const idx = Number((e.target as HTMLElement).dataset.idx);
						if (!Number.isNaN(idx)) current = idx;
					}
				}
			},
			{ root: container, threshold: [0.6] }
		);
		// (Re)observe whenever the item set changes.
		void items.length;
		tick().then(() => {
			if (!container || !observer) return;
			for (const child of Array.from(container.children)) observer.observe(child);
		});
		return () => observer?.disconnect();
	});

	// Wheel: hijack to page one slide at a time (debounced).
	let wheelLock = false;
	function onWheel(e: WheelEvent) {
		if (Math.abs(e.deltaY) < 20) return;
		e.preventDefault();
		if (wheelLock) return;
		wheelLock = true;
		go(e.deltaY > 0 ? 1 : -1);
		setTimeout(() => (wheelLock = false), 550);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
			e.preventDefault();
			go(1);
		} else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
			e.preventDefault();
			go(-1);
		}
	}

	// Touch swipe (native scroll-snap handles most, but this makes short flicks
	// reliably advance exactly one slide).
	let touchStartY = 0;
	function onTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0].clientY;
	}
	function onTouchEnd(e: TouchEvent) {
		const dy = touchStartY - e.changedTouches[0].clientY;
		if (Math.abs(dy) > 60) go(dy > 0 ? 1 : -1);
	}
</script>

<svelte:head>
	<title>Feed · Kazwire</title>
	<meta name="description" content="Swipe through Kazwire games one at a time — AI community creations and the full library." />
</svelte:head>

<svelte:window onkeydown={onKey} />

<!--
  The single scroller, pinned below the global Nav (top = measured nav height,
  bottom = viewport). Pinning with `fixed` takes it out of document flow so the
  layout's Footer can't add height below it — the ONLY scroller is this snap
  container (no outer/double scrollbar), and the nav above stays reachable.
  snap-y + snap-mandatory makes each slide a hard page stop (TikTok-style paging).
-->
<div
	bind:this={container}
	onwheel={onWheel}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	style="top: {navOffset}px"
	class="fixed inset-x-0 bottom-0 z-40 w-full snap-y snap-mandatory overflow-y-scroll overscroll-none bg-neutral [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
	tabindex="-1"
	role="listbox"
	aria-label="Game feed"
>
	{#each items as item, i (item.kind + item.href + i)}
		<div data-idx={i}>
			<FeedSlide {item} {navOffset} active={i === current} visible={inWindow(i)} />
		</div>
	{/each}
</div>

<!-- Loading pill while the AI gallery resolves -->
{#if loadingAi}
	<div
		class="pointer-events-none fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur"
	>
		Loading AI games…
	</div>
{/if}

<!-- Up/Down nav hints (desktop) -->
<div class="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
	<button
		onclick={() => go(-1)}
		class="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30"
		disabled={current === 0}
		aria-label="Previous game"
	>
		<Icon icon="lucide:chevron-up" class="h-6 w-6" />
	</button>
	<button
		onclick={() => go(1)}
		class="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30"
		disabled={current === items.length - 1}
		aria-label="Next game"
	>
		<Icon icon="lucide:chevron-down" class="h-6 w-6" />
	</button>
</div>

<!-- Progress counter -->
<div
	class="fixed bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur pb-[env(safe-area-inset-bottom)]"
>
	{current + 1} / {items.length}
</div>
