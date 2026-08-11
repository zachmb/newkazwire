<!--
  PostCard.svelte — one post row in the Twitter/X-style /feed.

  Mobbin reference (design source): X (Twitter) home timeline — For You (iOS)
  https://mobbin.com/screens/996603fa-1a10-4bc1-9431-030fa88848f2
  Borrowed structure: circular avatar on the left, a header line of bold author
  name + subdued handle/meta + relative time, the post body below, then a light
  action row where the like control lives. Kept flat + token-driven so it reads
  cleanly in both the light and dark daisyUI themes.
-->
<script lang="ts">
	import Icon from '@iconify/svelte';

	type Post = {
		id: string;
		uid: string;
		author: string;
		location?: string;
		text: string;
		gameId?: string;
		gameTitle?: string;
		createdAt: number | string;
		likes: number;
	};

	let { post }: { post: Post } = $props();

	// Optimistic like state — increments locally on tap, POSTs in the background,
	// reconciles to the server's authoritative count, and rolls back on failure.
	let liked = $state(false);
	let likes = $state(post.likes ?? 0);
	let liking = $state(false);

	async function like() {
		if (liked || liking) return; // one like per session per card
		liking = true;
		liked = true;
		likes += 1; // optimistic
		try {
			const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}/like`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: '{}'
			});
			const data = await res.json().catch(() => null);
			if (res.ok && data?.success && typeof data.likes === 'number') {
				likes = data.likes; // reconcile to server truth
			} else {
				throw new Error(data?.error || 'like failed');
			}
		} catch {
			// Roll back the optimistic bump.
			liked = false;
			likes = Math.max(0, likes - 1);
		} finally {
			liking = false;
		}
	}

	const initial = $derived((post.author?.trim()?.[0] || '?').toUpperCase());

	// Relative "time ago" from a ms epoch or ISO string.
	const relTime = $derived(formatAgo(post.createdAt));
	function formatAgo(ts: number | string): string {
		const t = typeof ts === 'number' ? ts : Date.parse(ts);
		if (!t || Number.isNaN(t)) return '';
		const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
		if (s < 45) return 'now';
		if (s < 90) return '1m';
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h`;
		const d = Math.floor(h / 24);
		if (d < 7) return `${d}d`;
		const w = Math.floor(d / 7);
		if (w < 5) return `${w}w`;
		return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	// Split into lines so we can preserve author-authored line breaks WITHOUT ever
	// using {@html}. Svelte auto-escapes each text node, so HTML in a post is
	// rendered as literal, harmless text (emoji still render — they're just chars).
	const lines = $derived((post.text || '').split('\n'));
</script>

<article class="flex gap-3 border-b border-base-300 px-4 py-4">
	<!-- Avatar -->
	<a
		href="/u/{post.uid}"
		class="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-black text-primary-content"
		aria-label="View {post.author}'s profile"
	>
		{initial}
	</a>

	<div class="min-w-0 flex-1">
		<!-- Header: name · location · time -->
		<div class="flex flex-wrap items-center gap-x-1.5 text-sm leading-tight">
			<a
				href="/u/{post.uid}"
				class="font-bold text-base-content hover:underline"
			>
				{post.author}
			</a>
			{#if post.location}
				<span class="inline-flex items-center gap-0.5 text-base-content/50">
					<Icon icon="lucide:map-pin" class="h-3 w-3" />
					{post.location}
				</span>
			{/if}
			{#if relTime}
				<span class="text-base-content/40">·</span>
				<span class="text-base-content/50">{relTime}</span>
			{/if}
		</div>

		<!-- Body: escaped text, line breaks preserved -->
		<div class="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-base-content">
			{#each lines as line, i (i)}{#if i > 0}<br />{/if}{line}{/each}
		</div>

		<!-- Optional attached game mini-card -->
		{#if post.gameId}
			<a
				href="/ai/user-g/{post.gameId}"
				class="mt-3 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200 p-3 transition-colors hover:border-primary/60 hover:bg-base-300"
			>
				<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
					<Icon icon="lucide:gamepad-2" class="h-5 w-5" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-bold text-base-content">
						{post.gameTitle || 'Play this game'}
					</span>
					<span class="block text-xs text-base-content/50">Tap to play on Kazwire</span>
				</span>
				<Icon icon="lucide:chevron-right" class="h-5 w-5 shrink-0 text-base-content/40" />
			</a>
		{/if}

		<!-- Action row -->
		<div class="mt-3 flex items-center">
			<button
				type="button"
				onclick={like}
				disabled={liked}
				aria-pressed={liked}
				aria-label={liked ? 'Liked' : 'Like this post'}
				class="group -ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-base-content/50 transition-colors hover:text-primary disabled:cursor-default {liked
					? 'text-primary'
					: ''}"
			>
				<Icon
					icon="lucide:heart"
					class="h-4 w-4 transition-transform group-active:scale-125 {liked
						? 'fill-primary text-primary'
						: ''}"
				/>
				{#if likes > 0}
					<span class="tabular-nums font-semibold">{likes}</span>
				{/if}
			</button>
		</div>
	</div>
</article>
