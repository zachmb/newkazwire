<!--
  /feed — Kazwire's single scroll feed: a TikTok-style vertical swiper through
  games AND community posts, one per screen. (The old Twitter-style timeline was
  removed; posting still exists — a new post shows up as a slide right here in the
  games scroll feed.)

  Mobbin reference (design source): TikTok "Watching videos" flow (iOS)
  https://mobbin.com/flows/c7203035-45cc-4ed9-aeb7-73626b6f6b4d
  Full-bleed cover, bottom scrim + text stack, snap-y snap-mandatory paging.

  Covers the main library, AI community games (/api/ai/gallery) and posts
  (/api/posts) woven together. Degrades gracefully if a fetch fails.
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Icon from '@iconify/svelte';
	import { games as libraryGames } from '$lib/data/games';
	import { getCDNImageUrl } from '$lib/utils/cdn';
	import FeedSlide from '$lib/components/Feed/FeedSlide.svelte';
	import PostComposer from '$lib/components/Feed/PostComposer.svelte';

	type FeedItem = {
		kind: 'ai' | 'library' | 'post';
		title: string;
		image: string;
		href: string;
		creatorName: string;
		creatorLocation?: string;
		rating: number;
		chip: string;
		postText?: string;
		gameTitle?: string;
		link?: string;
		likes?: number;
	};

	type PublicUserGame = {
		id: string;
		title: string;
		creatorName?: string;
		creatorLocation?: string;
		coverUrl?: string;
		avgRating?: number;
	};

	type Post = {
		id: string;
		uid: string;
		author: string;
		location?: string;
		text: string;
		gameId?: string;
		gameTitle?: string;
		link?: string;
		createdAt: number | string;
		likes: number;
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

	function mapPost(p: Post): FeedItem {
		return {
			kind: 'post',
			title: p.text || 'Post',
			image: '',
			href: p.gameId ? `/ai/user-g/${p.gameId}` : '',
			creatorName: p.author || 'Anonymous',
			rating: 0,
			chip: 'Post',
			postText: p.text,
			gameTitle: p.gameTitle,
			link: p.link,
			likes: p.likes
		};
	}

	// Weave posts + AI games + library into one feed. Lead with the newest post (if
	// any) so a fresh post is instantly visible, then a few AI games, then the
	// library with the remaining posts + AI games sprinkled through.
	function build(posts: FeedItem[], ai: FeedItem[], lib: FeedItem[]): FeedItem[] {
		const out: FeedItem[] = [];
		if (posts.length) out.push(posts[0]);
		const LEAD = Math.min(3, ai.length);
		out.push(...ai.slice(0, LEAD));
		const restAi = ai.slice(LEAD);
		const restPosts = posts.slice(1);
		let ai_i = 0;
		let p_i = 0;
		for (let i = 0; i < lib.length; i++) {
			out.push(lib[i]);
			// Sprinkle a remaining post every ~5 games and an AI game every ~4.
			if (i % 5 === 4 && p_i < restPosts.length) out.push(restPosts[p_i++]);
			if (i % 4 === 3 && ai_i < restAi.length) out.push(restAi[ai_i++]);
		}
		while (p_i < restPosts.length) out.push(restPosts[p_i++]);
		while (ai_i < restAi.length) out.push(restAi[ai_i++]);
		return out;
	}

	const libItems: FeedItem[] = libraryGames.map(mapLibrary);

	let aiItems = $state<FeedItem[]>([]);
	let postItems = $state<FeedItem[]>([]);
	let items = $state<FeedItem[]>(libItems);
	let current = $state(0);
	let loadingExtras = $state(true);
	let container = $state<HTMLDivElement | null>(null);

	// Compose overlay (posting still works — the post lands as a slide in this feed).
	let composing = $state(false);

	function rebuild() {
		items = build(postItems, aiItems, libItems);
	}

	// The global layout renders a static Nav above <main>, so the feed's usable
	// height is the viewport minus however far <main> is pushed down (varies by
	// breakpoint). Measure it at runtime so each slide fills exactly the space
	// under the nav — no double scrollbar, and the nav stays visible/usable.
	let navOffset = $state(0);
	function measureNav() {
		const main = container?.closest('main');
		navOffset = main ? Math.round(main.getBoundingClientRect().top) : 0;
	}

	// Render window: only mount current +/- 1 slides for perf on long feeds.
	function inWindow(i: number): boolean {
		return Math.abs(i - current) <= 1;
	}

	// A freshly-created post: prepend it as a slide and jump to the top so the
	// author immediately sees their post live in the feed.
	function onPosted(post: Post) {
		postItems = [mapPost(post), ...postItems];
		rebuild();
		composing = false;
		tick().then(() => scrollToIndex(0));
	}

	onMount(() => {
		let cancelled = false;
		measureNav();
		window.addEventListener('resize', measureNav);

		// The global layout appends a Footer below <main>, which would leave the
		// document taller than the viewport and produce a second (outer) scrollbar
		// competing with the feed's snap scroller. Lock page scroll while the feed
		// is mounted so the snap container is the ONLY scroller; restore on unmount.
		const prevBody = document.body.style.overflow;
		const prevHtml = document.documentElement.style.overflow;
		document.body.style.overflow = 'hidden';
		document.documentElement.style.overflow = 'hidden';
		(async () => {
			try {
				const [galleryRes, postsRes] = await Promise.allSettled([
					fetch('/api/ai/gallery'),
					fetch('/api/posts?limit=100')
				]);
				if (galleryRes.status === 'fulfilled' && galleryRes.value.ok) {
					const data = await galleryRes.value.json();
					const aiGames: PublicUserGame[] = Array.isArray(data?.games) ? data.games : [];
					aiItems = aiGames.map(mapAi).filter((g) => g.image);
				}
				if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
					const data = await postsRes.value.json();
					const posts: Post[] = data?.success && Array.isArray(data.posts) ? data.posts : [];
					postItems = posts.map(mapPost);
				}
				if (!cancelled && (aiItems.length || postItems.length)) rebuild();
			} catch (e) {
				// Degrade gracefully — library-only feed already rendered.
				console.warn('Feed: extras unavailable, showing library only.', e);
			} finally {
				if (!cancelled) loadingExtras = false;
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
		if (composing) return;
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
	<meta name="description" content="Swipe through Kazwire — games, AI community creations and community posts, one at a time." />
</svelte:head>

<svelte:window onkeydown={onKey} />

<!--
  The single scroller, pinned below the global Nav (top = measured nav height,
  bottom = viewport). Pinning with `fixed` takes it out of document flow so the
  layout's Footer can't add height below it — the ONLY scroller is this snap
  container. snap-y + snap-mandatory makes each slide a hard page stop.
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
	aria-label="Kazwire feed"
>
	{#each items as item, i (item.kind + item.href + item.title + i)}
		<div data-idx={i}>
			<FeedSlide {item} {navOffset} active={i === current} visible={inWindow(i)} />
		</div>
	{/each}
</div>

<!-- Compose FAB: posting still works; a new post lands as a slide in this feed -->
<button
	onclick={() => (composing = true)}
	class="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-content shadow-xl transition-transform active:scale-95 pb-[env(safe-area-inset-bottom)]"
	aria-label="Create a post"
>
	<Icon icon="lucide:pencil" class="h-4 w-4" />
	Post
</button>

<!-- Compose overlay -->
{#if composing}
	<div
		class="fixed inset-0 z-[1000] flex items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm"
		role="button"
		tabindex="0"
		onclick={(e) => { if (e.target === e.currentTarget) composing = false; }}
		onkeydown={(e) => { if (e.key === 'Escape') composing = false; }}
	>
		<div class="w-full max-w-xl overflow-hidden rounded-3xl bg-base-100 shadow-2xl">
			<div class="flex items-center justify-between border-b border-base-300 px-4 py-3">
				<h2 class="flex items-center gap-2 text-sm font-black text-base-content">
					<Icon icon="lucide:pencil" class="h-4 w-4 text-primary" />
					New post
				</h2>
				<button
					onclick={() => (composing = false)}
					class="grid h-8 w-8 place-items-center rounded-full text-base-content/60 hover:bg-base-200"
					aria-label="Close"
				>
					<Icon icon="lucide:x" class="h-5 w-5" />
				</button>
			</div>
			<PostComposer onposted={onPosted} />
		</div>
	</div>
{/if}

<!-- Loading pill while AI gallery + posts resolve -->
{#if loadingExtras}
	<div
		class="pointer-events-none fixed left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur"
	>
		Loading feed…
	</div>
{/if}

<!-- Up/Down nav hints (desktop) -->
<div class="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
	<button
		onclick={() => go(-1)}
		class="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30"
		disabled={current === 0}
		aria-label="Previous"
	>
		<Icon icon="lucide:chevron-up" class="h-6 w-6" />
	</button>
	<button
		onclick={() => go(1)}
		class="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-30"
		disabled={current === items.length - 1}
		aria-label="Next"
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
