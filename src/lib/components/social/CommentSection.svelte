<script lang="ts">
	/**
	 * CommentSection — self-contained threaded comments for a game page.
	 *
	 * Fully self-contained: give it a `gameId` and it loads its own data, renders a
	 * name-gated composer, a list of top-level comments each with ONE level of replies
	 * (a "Reply" toggle), and optimistic like buttons on both comments and replies.
	 *
	 * Design grounded in Digg's threaded thread view
	 * (mobbin.com/screens/c90b74cc-d68b-48ea-8430-324c6043f115): a top comment, an
	 * indented single level of replies with a left rule, an inline "Reply" affordance,
	 * and a compact vote control — plus Beli's clean indented reply + heart-tap like
	 * (mobbin.com/screens/4887d28c-df84-492f-8a03-c991d0177a67). Kazwire recolors to
	 * the brand primary + daisyUI tokens (light/dark safe).
	 *
	 * Safety: user text is rendered via Svelte's `{text}` interpolation, which HTML-escapes
	 * automatically — no {@html}, so no XSS from comment/reply/author bodies.
	 */
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { getUid, getPlayerName, setPlayerName } from '$lib/utils/streak';

	/**
	 * Whether the visitor has actually chosen a name. `getPlayerName()` falls back to
	 * 'Anonymous' when unset, so we read the raw localStorage key to decide whether to
	 * show the name-gate. Kept local so the component stays self-contained.
	 */
	function storedName(): string {
		if (typeof window === 'undefined') return '';
		try {
			return (localStorage.getItem('kazwire_player_name') || '').trim();
		} catch {
			return '';
		}
	}

	interface Reply {
		id: string;
		uid: string;
		author: string;
		location?: string;
		text: string;
		createdAt: string | number;
		likes: number;
	}
	interface Comment extends Reply {
		replies: Reply[];
	}

	export let gameId: string;

	let comments: Comment[] = [];
	let loading = true;
	let failed = false;

	// Composer state
	let nameInput = '';
	let hasName = false;
	let draft = '';
	let posting = false;
	let composerError = '';

	// Per-comment reply UI state
	let openReply: Record<string, boolean> = {};
	let replyDraft: Record<string, string> = {};
	let replyPosting: Record<string, boolean> = {};
	let replyError: Record<string, string> = {};

	// Optimistic-like guard: remember which ids this browser already liked this session
	// so a double-tap doesn't keep bumping the local count.
	let liked: Record<string, boolean> = {};

	onMount(async () => {
		const n = storedName();
		hasName = !!n;
		if (hasName) nameInput = n;
		await load();
	});

	async function load() {
		loading = true;
		failed = false;
		try {
			const res = await fetch(`/api/comments?gameId=${encodeURIComponent(gameId)}`);
			const data = await res.json();
			if (res.ok && Array.isArray(data?.comments)) {
				comments = data.comments;
			} else {
				failed = true;
			}
		} catch {
			failed = true;
		} finally {
			loading = false;
		}
	}

	function saveName() {
		const clean = nameInput.trim();
		if (!clean) return;
		setPlayerName(clean);
		nameInput = getPlayerName();
		hasName = true;
	}

	async function postComment() {
		const text = draft.trim();
		if (!text || posting) return;
		if (!hasName) {
			composerError = 'Pick a name first.';
			return;
		}
		posting = true;
		composerError = '';
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameId,
					uid: getUid(),
					author: getPlayerName(),
					text
				})
			});
			const data = await res.json();
			if (!res.ok || !data?.comment) {
				composerError = data?.error || 'Could not post your comment.';
				return;
			}
			comments = [{ ...data.comment, replies: data.comment.replies ?? [] }, ...comments];
			draft = '';
		} catch {
			composerError = 'Network error — try again.';
		} finally {
			posting = false;
		}
	}

	async function postReply(commentId: string) {
		const text = (replyDraft[commentId] || '').trim();
		if (!text || replyPosting[commentId]) return;
		if (!hasName) {
			replyError = { ...replyError, [commentId]: 'Pick a name first.' };
			return;
		}
		replyPosting = { ...replyPosting, [commentId]: true };
		replyError = { ...replyError, [commentId]: '' };
		try {
			const res = await fetch('/api/comments', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					gameId,
					uid: getUid(),
					author: getPlayerName(),
					text,
					parentId: commentId
				})
			});
			const data = await res.json();
			if (!res.ok || !data?.comment) {
				replyError = { ...replyError, [commentId]: data?.error || 'Could not post your reply.' };
				return;
			}
			comments = comments.map((c) =>
				c.id === commentId ? { ...c, replies: [...c.replies, data.comment] } : c
			);
			replyDraft = { ...replyDraft, [commentId]: '' };
			openReply = { ...openReply, [commentId]: false };
		} catch {
			replyError = { ...replyError, [commentId]: 'Network error — try again.' };
		} finally {
			replyPosting = { ...replyPosting, [commentId]: false };
		}
	}

	async function like(commentId: string, replyId?: string) {
		const key = replyId ? `${commentId}:${replyId}` : commentId;
		if (liked[key]) return;
		liked = { ...liked, [key]: true };

		// Optimistic bump.
		comments = comments.map((c) => {
			if (c.id !== commentId) return c;
			if (replyId) {
				return {
					...c,
					replies: c.replies.map((r) => (r.id === replyId ? { ...r, likes: r.likes + 1 } : r))
				};
			}
			return { ...c, likes: c.likes + 1 };
		});

		try {
			const res = await fetch('/api/comments/like', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ gameId, commentId, replyId })
			});
			const data = await res.json();
			if (res.ok && typeof data?.likes === 'number') {
				// Reconcile to the server's authoritative count.
				const server = data.likes;
				comments = comments.map((c) => {
					if (c.id !== commentId) return c;
					if (replyId) {
						return {
							...c,
							replies: c.replies.map((r) => (r.id === replyId ? { ...r, likes: server } : r))
						};
					}
					return { ...c, likes: server };
				});
			}
		} catch {
			// Keep the optimistic value; failing silently is fine for a like.
		}
	}

	function toggleReply(id: string) {
		openReply = { ...openReply, [id]: !openReply[id] };
	}

	/** Compact relative time ("just now", "5m", "3h", "2d", or a date). */
	function timeAgo(input: string | number): string {
		const then = new Date(input).getTime();
		if (Number.isNaN(then)) return '';
		const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
		if (s < 45) return 'just now';
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h`;
		const d = Math.floor(h / 24);
		if (d < 7) return `${d}d`;
		return new Date(then).toLocaleDateString();
	}

	function initial(name: string): string {
		return (name || '?').trim().charAt(0).toUpperCase() || '?';
	}

	$: totalCount = comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
</script>

<section class="rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
	<div class="mb-5 flex items-center gap-2">
		<Icon icon="mdi:comment-multiple-outline" class="text-2xl text-primary" />
		<h3 class="text-2xl font-black text-base-content">
			Comments{#if !loading && !failed}<span class="ml-1 text-base-content/40">{totalCount}</span
				>{/if}
		</h3>
	</div>

	<!-- Composer -->
	<div class="mb-6 rounded-2xl bg-base-200 p-4">
		{#if !hasName}
			<label class="mb-2 block text-sm font-bold text-base-content/70" for="cs-name">
				Pick a name to comment
			</label>
			<div class="flex gap-2">
				<input
					id="cs-name"
					class="input input-bordered w-full flex-1"
					placeholder="Your name"
					maxlength="24"
					bind:value={nameInput}
					on:keydown={(e) => e.key === 'Enter' && saveName()}
				/>
				<button class="btn btn-primary font-bold text-white" on:click={saveName} disabled={!nameInput.trim()}>
					Save
				</button>
			</div>
		{:else}
			<div class="mb-2 flex items-center gap-2 text-sm text-base-content/60">
				<span
					class="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary"
					aria-hidden="true">{initial(getPlayerName())}</span
				>
				<span>Commenting as <span class="font-bold text-base-content">{getPlayerName()}</span></span>
				<button
					class="ml-auto text-xs font-semibold text-primary hover:underline"
					on:click={() => (hasName = false)}>Change</button
				>
			</div>
			<textarea
				class="textarea textarea-bordered w-full"
				rows="2"
				maxlength="1000"
				placeholder="Share a tip or a strategy…"
				bind:value={draft}
			></textarea>
			{#if composerError}
				<p class="mt-2 flex items-center gap-1 text-sm font-semibold text-error">
					<Icon icon="mdi:alert-circle-outline" /> {composerError}
				</p>
			{/if}
			<div class="mt-2 flex justify-end">
				<button
					class="btn btn-primary font-bold text-white"
					on:click={postComment}
					disabled={posting || !draft.trim()}
				>
					{#if posting}<Icon icon="line-md:loading-alt-loop" />{:else}Post{/if}
				</button>
			</div>
		{/if}
	</div>

	<!-- List -->
	{#if loading}
		<ul class="space-y-4">
			{#each Array(3) as _}
				<li class="flex gap-3">
					<div class="h-9 w-9 shrink-0 animate-pulse rounded-full bg-base-200"></div>
					<div class="flex-1 space-y-2">
						<div class="h-3 w-32 animate-pulse rounded bg-base-200"></div>
						<div class="h-3 w-full animate-pulse rounded bg-base-200"></div>
					</div>
				</li>
			{/each}
		</ul>
	{:else if failed}
		<p class="rounded-xl bg-base-200 p-4 text-sm text-base-content/60">
			Couldn’t load comments right now. Try again in a bit.
		</p>
	{:else if comments.length === 0}
		<div class="flex flex-col items-center gap-2 rounded-xl bg-base-200 p-8 text-center">
			<Icon icon="mdi:comment-outline" class="text-3xl text-base-content/30" />
			<p class="text-sm font-semibold text-base-content/60">No comments yet.</p>
			<p class="text-xs text-base-content/40">Be the first to share a tip.</p>
		</div>
	{:else}
		<ul class="space-y-5">
			{#each comments as c (c.id)}
				<li>
					<!-- Top-level comment -->
					<div class="flex gap-3">
						<span
							class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary"
							aria-hidden="true">{initial(c.author)}</span
						>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-x-2 text-sm">
								<a href="/u/{c.uid}" class="font-bold text-base-content hover:text-primary hover:underline"
									>{c.author}</a
								>
								{#if c.location}<span class="text-xs text-base-content/40">{c.location}</span>{/if}
								<span class="text-xs text-base-content/40">· {timeAgo(c.createdAt)}</span>
							</div>
							<p class="mt-0.5 whitespace-pre-wrap break-words text-sm text-base-content/90">{c.text}</p>
							<div class="mt-1.5 flex items-center gap-4">
								<button
									class="flex items-center gap-1 text-xs font-semibold transition-colors {liked[c.id]
										? 'text-primary'
										: 'text-base-content/50 hover:text-primary'}"
									on:click={() => like(c.id)}
									aria-label="Like comment"
								>
									<Icon icon={liked[c.id] ? 'mdi:heart' : 'mdi:heart-outline'} class="text-sm" />
									<span class="tabular-nums">{c.likes}</span>
								</button>
								<button
									class="text-xs font-semibold text-base-content/50 hover:text-primary"
									on:click={() => toggleReply(c.id)}
								>
									Reply
								</button>
							</div>

							<!-- Reply composer -->
							{#if openReply[c.id]}
								<div class="mt-3 rounded-xl bg-base-200 p-3">
									{#if !hasName}
										<p class="mb-2 text-xs font-semibold text-base-content/60">
											Pick a name above to reply.
										</p>
									{:else}
										<textarea
											class="textarea textarea-bordered textarea-sm w-full"
											rows="2"
											maxlength="1000"
											placeholder="Write a reply…"
											bind:value={replyDraft[c.id]}
										></textarea>
										{#if replyError[c.id]}
											<p class="mt-1 flex items-center gap-1 text-xs font-semibold text-error">
												<Icon icon="mdi:alert-circle-outline" /> {replyError[c.id]}
											</p>
										{/if}
										<div class="mt-2 flex justify-end gap-2">
											<button
												class="btn btn-ghost btn-sm"
												on:click={() => toggleReply(c.id)}>Cancel</button
											>
											<button
												class="btn btn-primary btn-sm font-bold text-white"
												on:click={() => postReply(c.id)}
												disabled={replyPosting[c.id] || !(replyDraft[c.id] || '').trim()}
											>
												{#if replyPosting[c.id]}<Icon icon="line-md:loading-alt-loop" />{:else}Reply{/if}
											</button>
										</div>
									{/if}
								</div>
							{/if}

							<!-- Replies (one level, left rule) -->
							{#if c.replies?.length}
								<ul class="mt-3 space-y-3 border-l-2 border-base-200 pl-4">
									{#each c.replies as r (r.id)}
										<li class="flex gap-2.5">
											<span
												class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary"
												aria-hidden="true">{initial(r.author)}</span
											>
											<div class="min-w-0 flex-1">
												<div class="flex flex-wrap items-center gap-x-2 text-sm">
													<a
														href="/u/{r.uid}"
														class="font-bold text-base-content hover:text-primary hover:underline"
														>{r.author}</a
													>
													{#if r.location}<span class="text-xs text-base-content/40">{r.location}</span
														>{/if}
													<span class="text-xs text-base-content/40">· {timeAgo(r.createdAt)}</span>
												</div>
												<p class="mt-0.5 whitespace-pre-wrap break-words text-sm text-base-content/90">
													{r.text}
												</p>
												<button
													class="mt-1 flex items-center gap-1 text-xs font-semibold transition-colors {liked[
														`${c.id}:${r.id}`
													]
														? 'text-primary'
														: 'text-base-content/50 hover:text-primary'}"
													on:click={() => like(c.id, r.id)}
													aria-label="Like reply"
												>
													<Icon
														icon={liked[`${c.id}:${r.id}`] ? 'mdi:heart' : 'mdi:heart-outline'}
														class="text-sm"
													/>
													<span class="tabular-nums">{r.likes}</span>
												</button>
											</div>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
