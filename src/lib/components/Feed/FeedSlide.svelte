<!--
  FeedSlide.svelte — one full-screen game "slide" in the vertical swipe feed.

  Mobbin reference: TikTok "Watching videos" flow (iOS)
  https://mobbin.com/flows/c7203035-45cc-4ed9-aeb7-73626b6f6b4d
  Layout borrowed from TikTok's For You screen: full-bleed media, a heavy
  bottom scrim, the primary text stack pinned bottom-left (creator + title +
  attribution), a right-hand action rail, and a small chip up top.
-->
<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getUid, getPlayerName, setPlayerName, hasPlayerName } from '$lib/utils/streak';

	type FeedItem = {
		kind: 'ai' | 'library' | 'post';
		title: string;
		image: string; // resolved cover/image URL
		href: string;
		creatorName: string;
		creatorLocation?: string;
		rating: number; // 0..5
		chip: string; // "AI" or a category
		postId?: string; // for kind === 'post' — used by like/reply
		postText?: string; // for kind === 'post'
		gameTitle?: string; // attached game title on a post
		link?: string; // optional user link on a post
		likes?: number;
		replyCount?: number; // for kind === 'post'
		createdAt?: number | string; // for kind === 'post'
	};

	// Short, readable label for a URL (host + trimmed path).
	function linkLabel(url: string): string {
		try {
			const u = new URL(url);
			const path = u.pathname === '/' ? '' : u.pathname;
			return (u.host + path).replace(/\/$/, '').slice(0, 42);
		} catch {
			return url.slice(0, 42);
		}
	}

	// Relative "time ago" from a ms epoch or ISO string.
	function formatAgo(ts: number | string | undefined): string {
		if (ts === undefined) return '';
		const t = typeof ts === 'number' ? ts : Date.parse(ts);
		if (!t || Number.isNaN(t)) return '';
		const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
		if (s < 45) return 'now';
		if (s < 90) return '1m ago';
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		if (d < 7) return `${d}d ago`;
		const w = Math.floor(d / 7);
		if (w < 5) return `${w}w ago`;
		return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	let {
		item,
		active = false,
		visible = true,
		navOffset = 0
	}: { item: FeedItem; active?: boolean; visible?: boolean; navOffset?: number } = $props();

	let imgLoaded = $state(false);
	let imgFailed = $state(false);

	// Only stars we actually earned; rounded to nearest half for display.
	const fullStars = $derived(Math.round(item.rating));

	// Post text: preserve author line breaks (auto-escaped; never {@html}).
	const postLines = $derived((item.postText || item.title || '').split('\n'));
	const relTime = $derived(formatAgo(item.createdAt));
	const initial = $derived((item.creatorName?.trim()?.[0] || '?').toUpperCase());
	// Long posts get a slightly smaller size so they stay readable and fit.
	const longPost = $derived((item.postText || item.title || '').length > 180);

	// Optimistic like on the post slide — POSTs to the same /api/posts/:id/like
	// endpoint the timeline card uses; reconciles to server truth, rolls back on error.
	let liked = $state(false);
	let likes = $state(item.likes ?? 0);
	let liking = $state(false);

	async function likePost() {
		if (!item.postId || liked || liking) return;
		liking = true;
		liked = true;
		likes += 1; // optimistic
		try {
			const res = await fetch(`/api/posts/${encodeURIComponent(item.postId)}/like`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});
			const data = await res.json().catch(() => null);
			if (res.ok && data?.success && typeof data.likes === 'number') {
				likes = data.likes;
			} else {
				throw new Error(data?.error || 'like failed');
			}
		} catch {
			liked = false;
			likes = Math.max(0, likes - 1);
		} finally {
			liking = false;
		}
	}

	// Inline reply on the post slide — same /api/posts/:id/reply the timeline uses.
	let showReply = $state(false);
	let replyText = $state('');
	let replying = $state(false);
	let replyErr = $state('');
	let replyCount = $state(item.replyCount ?? 0);
	let replyDone = $state(false);

	function ensureNamed(): boolean {
		if (hasPlayerName()) return true;
		const n = (prompt('Pick a display name first:') || '').trim();
		if (!n) return false;
		setPlayerName(n);
		return true;
	}

	async function sendReply() {
		const t = replyText.trim();
		if (!t || replying || !item.postId) return;
		if (!ensureNamed()) return;
		replying = true;
		replyErr = '';
		try {
			const res = await fetch(`/api/posts/${encodeURIComponent(item.postId)}/reply`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid: getUid(), author: getPlayerName(), text: t })
			});
			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to reply');
			replyText = '';
			replyCount += 1;
			replyDone = true;
			showReply = false;
		} catch (e: any) {
			replyErr = e?.message || 'Failed to reply';
		} finally {
			replying = false;
		}
	}
</script>

<section
	style="height: calc(100dvh - {navOffset}px)"
	class="relative w-full snap-start overflow-hidden bg-neutral text-neutral-content [scroll-snap-stop:always]"
	aria-roledescription="slide"
	aria-label={item.title}
>
	{#if item.kind === 'post'}
		<!--
		  POST slide — deliberately distinct from the full-bleed game slides: a flat
		  base-200 canvas with a centered card so a text post reads like something you
		  read, not a video you watch. Card scrolls internally if the post is long.
		-->
		<div class="absolute inset-0 bg-base-200"></div>

		<!-- Top-aligned (not centered): a lone short post otherwise floats in an empty
		     viewport and reads as broken rather than "top of the feed". -->
		<div class="relative z-10 flex h-full w-full items-start justify-center overflow-y-auto px-4 pb-16 pt-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			<div class="flex w-full max-w-xl flex-col rounded-box border border-base-content/10 bg-base-100 p-5 shadow-sm sm:p-6">
				<!-- Header: chip + author + time -->
				<div class="flex items-center gap-3">
					<span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-lg font-black text-primary-content">
						{initial}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-1.5 truncate text-sm font-bold text-base-content">
							{item.creatorName}
						</div>
						<div class="flex items-center gap-1.5 text-xs text-base-content/50">
							<Icon icon="lucide:message-square-text" class="h-3 w-3" />
							<span>Post{#if relTime} · {relTime}{/if}</span>
						</div>
					</div>
				</div>

				<!-- Post body: readable size + leading, line breaks preserved -->
				<div
					class="mt-4 whitespace-pre-wrap break-words text-base-content {longPost
						? 'text-lg leading-relaxed'
						: 'text-xl leading-relaxed sm:text-2xl'}"
				>
					{#each postLines as line, i (i)}{#if i > 0}<br />{/if}{line}{/each}
				</div>

				<!-- Attached game -->
				{#if item.href && item.gameTitle}
					<a
						href={item.href}
						class="mt-5 flex items-center gap-3 rounded-xl border border-base-300 bg-base-200 p-3 transition-colors hover:border-primary/60 hover:bg-base-300"
					>
						<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
							<Icon icon="lucide:gamepad-2" class="h-5 w-5" />
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-bold text-base-content">{item.gameTitle}</span>
							<span class="block text-xs text-base-content/50">Tap to play</span>
						</span>
						<Icon icon="lucide:chevron-right" class="h-5 w-5 shrink-0 text-base-content/40" />
					</a>
				{/if}

				<!-- Optional link as an obvious button -->
				{#if item.link}
					<a
						href={item.link}
						target="_blank"
						rel="noopener nofollow"
						class="mt-3 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-content transition-transform active:scale-[0.98]"
					>
						<Icon icon="lucide:external-link" class="h-4 w-4 shrink-0" />
						<span class="truncate">{linkLabel(item.link)}</span>
					</a>
				{/if}

				<!-- Actions: like + reply (reply opens the full thread on the post) -->
				<div class="mt-5 flex items-center gap-2 border-t border-base-300 pt-4">
					<button
						type="button"
						onclick={likePost}
						disabled={liked}
						aria-pressed={liked}
						aria-label={liked ? 'Liked' : 'Like this post'}
						class="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-primary/10 disabled:cursor-default {liked
							? 'text-primary'
							: 'text-base-content/60 hover:text-primary'}"
					>
						<Icon
							icon="lucide:heart"
							class="h-4 w-4 transition-transform group-active:scale-125 {liked ? 'fill-primary text-primary' : ''}"
						/>
						<span class="tabular-nums">{likes}</span>
						<span>Like{likes === 1 ? '' : 's'}</span>
					</button>

					<button
						type="button"
						onclick={() => (showReply = !showReply)}
						aria-expanded={showReply}
						class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-primary/10 hover:text-primary {showReply
							? 'text-primary'
							: 'text-base-content/60'}"
						aria-label="Reply to this post"
					>
						<Icon icon="lucide:message-circle" class="h-4 w-4" />
						{#if replyCount > 0}<span class="tabular-nums">{replyCount}</span>{/if}
						<span>Reply</span>
					</button>
				</div>

				<!-- Inline reply composer -->
				{#if showReply}
					<div class="mt-3 flex flex-col gap-2">
						<div class="flex gap-2">
							<input
								class="input input-sm input-bordered flex-1"
								placeholder="Write a reply…"
								maxlength="500"
								bind:value={replyText}
								onkeydown={(e) => e.key === 'Enter' && sendReply()}
							/>
							<button
								type="button"
								class="btn btn-sm btn-primary text-primary-content"
								onclick={sendReply}
								disabled={replying || !replyText.trim()}
							>
								{#if replying}<span class="loading loading-spinner loading-xs"></span>{/if}
								Reply
							</button>
						</div>
						{#if replyErr}
							<span class="text-xs font-semibold text-error">{replyErr}</span>
						{/if}
					</div>
				{:else if replyDone}
					<p class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-base-content/50">
						<Icon icon="lucide:check" class="h-3.5 w-3.5" />
						Reply posted
					</p>
				{/if}
			</div>
		</div>
	{:else}
	<!-- Media (lazy: only paint when this slide is in the render window) -->
	{#if visible && item.image && !imgFailed}
		<img
			src={item.image}
			alt={item.title}
			loading="lazy"
			decoding="async"
			onload={() => (imgLoaded = true)}
			onerror={() => (imgFailed = true)}
			class="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out {imgLoaded
				? 'scale-100 opacity-100'
				: 'scale-105 opacity-0'} {active ? 'motion-safe:scale-[1.04]' : ''}"
		/>
	{/if}

	<!-- Fallback / loading backdrop -->
	{#if !imgLoaded || imgFailed}
		<div
			class="absolute inset-0 grid place-items-center bg-primary/15"
		>
			<Icon icon="lucide:gamepad-2" class="h-16 w-16 text-base-content/30" />
		</div>
	{/if}

	<!-- Scrims: darken top (for chip) and bottom (for text) so content stays legible.
	     These MUST fade smoothly — flat bands were tried here and their hard edges
	     painted visible horizontal lines across every game cover. -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent"
	></div>
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/40 to-transparent"
	></div>

	<!-- Top chip -->
	<div class="absolute left-4 top-4 z-10 flex items-center gap-2 pt-[env(safe-area-inset-top)]">
		{#if item.kind === 'ai'}
			<span
				class="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-content shadow-md"
			>
				<Icon icon="lucide:sparkles" class="h-3.5 w-3.5" />
				AI
			</span>
		{:else}
			<span
				class="flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white"
			>
				{item.chip}
			</span>
		{/if}
	</div>

	<!-- Right action rail (TikTok-style vertical stack) -->
	<div
		class="absolute bottom-32 right-4 z-10 flex flex-col items-center gap-5 text-white sm:bottom-28"
	>
		<div class="flex flex-col items-center gap-1" aria-label="Rated {item.rating.toFixed(1)} out of 5">
			<Icon icon="lucide:star" class="h-8 w-8 fill-primary text-primary" />
			<span class="text-xs font-bold tabular-nums">{item.rating.toFixed(1)}</span>
		</div>
		<a
			href={item.href}
			class="flex flex-col items-center gap-1"
			aria-label="Play {item.title} now"
		>
			<span
				class="grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-content shadow-md transition-transform active:scale-90"
			>
				<Icon icon="lucide:play" class="h-6 w-6" />
			</span>
			<span class="text-xs font-bold">Play</span>
		</a>
	</div>

	<!-- Bottom text stack -->
	<div
		class="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-4 pb-8 pr-20 text-white pb-[calc(2rem+env(safe-area-inset-bottom))]"
	>
		<!-- Creator attribution (hidden when there's no named creator, e.g. library games) -->
		{#if item.creatorName}
		<div class="flex items-center gap-2 text-sm font-semibold">
			<span class="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-content">
				<Icon
					icon={item.kind === 'ai' ? 'lucide:user' : 'lucide:code'}
					class="h-4 w-4"
				/>
			</span>
			<span>{item.creatorName}</span>
			{#if item.creatorLocation}
				<span class="text-white/60">·</span>
				<span class="inline-flex items-center gap-1 text-white/70">
					<Icon icon="lucide:map-pin" class="h-3.5 w-3.5" />
					{item.creatorLocation}
				</span>
			{/if}
		</div>
		{/if}

		<!-- Title -->
		<h2 class="text-3xl font-black leading-tight tracking-tight">{item.title}</h2>

		<!-- Rating stars -->
		<div class="flex items-center gap-1" aria-label="Rated {item.rating.toFixed(1)} out of 5">
			{#each Array(5) as _, i (i)}
				<Icon
					icon="lucide:star"
					class="h-4 w-4 {i < fullStars ? 'fill-primary text-primary' : 'text-white/25'}"
				/>
			{/each}
			<span class="ml-1 text-xs font-semibold tabular-nums text-white/70">{item.rating.toFixed(1)}</span>
		</div>

		<!-- Primary PLAY button -->
		<a
			href={item.href}
			class="mt-3 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary py-4 text-lg font-black uppercase tracking-wide text-primary-content shadow-sm transition-transform active:scale-95"
		>
			<Icon icon="lucide:play" class="h-6 w-6" />
			Play
		</a>
	</div>
	{/if}
</section>
