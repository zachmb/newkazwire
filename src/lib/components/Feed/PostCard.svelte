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
	import { getUid, getPlayerName, setPlayerName, hasPlayerName } from '$lib/utils/streak';

	type Reply = { id: string; uid: string; author: string; location?: string; text: string; createdAt: number | string; likes: number };
	type RepostRef = { id: string; uid: string; author: string; location?: string; text: string; gameId?: string; gameTitle?: string; createdAt: number | string };
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
		replies?: Reply[];
		repostCount?: number;
		repostOf?: RepostRef;
	};

	let { post }: { post: Post } = $props();

	// When this post is a repost, the MAIN body shows the original content, with a small
	// "reposted" header above.
	const src = $derived(post.repostOf ?? post);
	const isRepost = $derived(!!post.repostOf);

	// Reply state
	let showReplies = $state(false);
	let replies = $state<Reply[]>(post.replies ?? []);
	let replyText = $state('');
	let replying = $state(false);
	let replyErr = $state('');

	// Repost state
	let reposted = $state(false);
	let repostCount = $state(post.repostCount ?? 0);

	function ensureNamed(): boolean {
		if (hasPlayerName()) return true;
		const n = (prompt('Pick a display name first:') || '').trim();
		if (!n) return false;
		setPlayerName(n);
		return true;
	}

	async function sendReply() {
		const text = replyText.trim();
		if (!text || replying) return;
		if (!ensureNamed()) return;
		replying = true;
		replyErr = '';
		try {
			const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}/reply`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid: getUid(), author: getPlayerName(), text })
			});
			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to reply');
			replies = [...replies, data.reply];
			replyText = '';
		} catch (e: any) {
			replyErr = e.message || 'Failed to reply';
		} finally {
			replying = false;
		}
	}

	async function repost() {
		if (reposted) return;
		if (!ensureNamed()) return;
		reposted = true;
		repostCount += 1;
		try {
			const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}/repost`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ uid: getUid(), author: getPlayerName() })
			});
			if (!res.ok) throw new Error('failed');
		} catch {
			reposted = false;
			repostCount = Math.max(0, repostCount - 1);
		}
	}

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

	const initial = $derived((src.author?.trim()?.[0] || '?').toUpperCase());

	// Relative "time ago" from a ms epoch or ISO string.
	const relTime = $derived(formatAgo(src.createdAt));
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
	const lines = $derived((src.text || '').split('\n'));
</script>

<article class="border-b border-base-300 px-4 py-4">
	{#if isRepost}
		<div class="mb-1.5 flex items-center gap-1.5 pl-14 text-xs font-semibold text-base-content/50">
			<Icon icon="lucide:repeat-2" class="h-3.5 w-3.5" />
			<a href="/u/{post.uid}" class="hover:underline">{post.author}</a> reposted
		</div>
	{/if}
	<div class="flex gap-3">
		<!-- Avatar -->
		<a
			href="/u/{src.uid}"
			class="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-black text-primary-content"
			aria-label="View {src.author}'s profile"
		>
			{initial}
		</a>

		<div class="min-w-0 flex-1">
			<!-- Header: name · location · time -->
			<div class="flex flex-wrap items-center gap-x-1.5 text-sm leading-tight">
				<a href="/u/{src.uid}" class="font-bold text-base-content hover:underline">{src.author}</a>
				{#if src.location}
					<span class="inline-flex items-center gap-0.5 text-base-content/50">
						<Icon icon="lucide:map-pin" class="h-3 w-3" />
						{src.location}
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
			{#if src.gameId}
				<a
					href="/ai/user-g/{src.gameId}"
					class="mt-3 flex items-center gap-3 rounded-2xl border border-base-300 bg-base-200 p-3 transition-colors hover:border-primary/60 hover:bg-base-300"
				>
					<span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
						<Icon icon="lucide:gamepad-2" class="h-5 w-5" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-bold text-base-content">{src.gameTitle || 'Play this game'}</span>
						<span class="block text-xs text-base-content/50">Tap to play on Kazwire</span>
					</span>
					<Icon icon="lucide:chevron-right" class="h-5 w-5 shrink-0 text-base-content/40" />
				</a>
			{/if}

			<!-- Action row -->
			<div class="mt-3 flex items-center gap-1">
				<button
					type="button"
					onclick={like}
					disabled={liked}
					aria-pressed={liked}
					aria-label={liked ? 'Liked' : 'Like this post'}
					class="group -ml-2 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-base-content/50 transition-colors hover:text-primary disabled:cursor-default {liked ? 'text-primary' : ''}"
				>
					<Icon icon="lucide:heart" class="h-4 w-4 transition-transform group-active:scale-125 {liked ? 'fill-primary text-primary' : ''}" />
					{#if likes > 0}<span class="tabular-nums font-semibold">{likes}</span>{/if}
				</button>

				<button
					type="button"
					onclick={() => (showReplies = !showReplies)}
					class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-base-content/50 transition-colors hover:text-primary"
					aria-label="Reply"
				>
					<Icon icon="lucide:message-circle" class="h-4 w-4" />
					{#if replies.length > 0}<span class="tabular-nums font-semibold">{replies.length}</span>{/if}
				</button>

				<button
					type="button"
					onclick={repost}
					disabled={reposted}
					class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm transition-colors hover:text-success disabled:cursor-default {reposted ? 'text-success' : 'text-base-content/50'}"
					aria-label="Repost"
				>
					<Icon icon="lucide:repeat-2" class="h-4 w-4" />
					{#if repostCount > 0}<span class="tabular-nums font-semibold">{repostCount}</span>{/if}
				</button>

				<a
					href={`/market?asset=post:${src.id}&kind=post&title=${encodeURIComponent((src.text || 'Post').slice(0, 40))}`}
					class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm text-base-content/50 transition-colors hover:text-primary"
					aria-label="Invest in this post"
					title="Invest Kazcoins in this post"
				>
					<Icon icon="lucide:trending-up" class="h-4 w-4" />
				</a>
			</div>

			<!-- Replies -->
			{#if showReplies}
				<div class="mt-2 flex flex-col gap-2 border-l-2 border-base-300 pl-3">
					{#each replies as r (r.id)}
						<div class="text-sm">
							<a href="/u/{r.uid}" class="font-bold text-base-content hover:underline">{r.author}</a>
							<span class="whitespace-pre-wrap break-words text-base-content/80"> {r.text}</span>
						</div>
					{/each}
					<div class="flex gap-2">
						<input
							class="input input-sm input-bordered flex-1"
							placeholder="Post your reply…"
							maxlength="500"
							bind:value={replyText}
							onkeydown={(e) => e.key === 'Enter' && sendReply()}
						/>
						<button class="btn btn-sm btn-primary text-white" onclick={sendReply} disabled={replying || !replyText.trim()}>Reply</button>
					</div>
					{#if replyErr}<span class="text-xs font-semibold text-error">{replyErr}</span>{/if}
				</div>
			{/if}
		</div>
	</div>
</article>
