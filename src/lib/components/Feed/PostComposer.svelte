<!--
  PostComposer.svelte — the "what's happening" box at the top of /feed.

  Mobbin reference (design source): X (Twitter) home timeline + inline composer (iOS)
  https://mobbin.com/screens/996603fa-1a10-4bc1-9431-030fa88848f2
  Borrowed: avatar-left composer row, a plain-looking textarea, a subdued action
  bar with the post button pinned right. Adds a char counter (500 max) and an
  optional "attach a game" picker specific to Kazwire.

  Account-free: if no display name is set yet, the composer first asks for one
  (setPlayerName) before allowing a post, matching the rest of the app's identity.
-->
<script lang="ts">
	import Icon from '@iconify/svelte';
	import { getUid, getPlayerName, setPlayerName } from '$lib/utils/streak';

	type MyGame = { id: string; title: string };
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

	// Parent prepends the returned post to its list optimistically.
	let { onposted }: { onposted?: (post: Post) => void } = $props();

	const MAX = 500;

	let text = $state('');
	let link = $state('');
	let posting = $state(false);
	let error = $state('');

	// Display name: getPlayerName() returns 'Anonymous' when unset in this codebase,
	// so treat that (and empty) as "needs a name" before the first post.
	let name = $state('');
	let nameNeeded = $state(false);
	let nameDraft = $state('');

	// Attach-a-game picker.
	let games = $state<MyGame[]>([]);
	let gamesLoaded = $state(false);
	let showPicker = $state(false);
	let attached = $state<MyGame | null>(null);

	const remaining = $derived(MAX - text.length);
	const overLimit = $derived(remaining < 0);
	const canPost = $derived(text.trim().length > 0 && !overLimit && !posting);

	function syncName() {
		const n = getPlayerName();
		name = n && n !== 'Anonymous' ? n : '';
	}

	async function loadGames() {
		showPicker = !showPicker;
		if (gamesLoaded || !showPicker) return;
		try {
			const res = await fetch('/api/ai/my-games');
			const data = await res.json().catch(() => null);
			if (res.ok && data?.success && Array.isArray(data.games)) {
				games = data.games
					.filter((g: any) => g?.id && g?.title)
					.map((g: any) => ({ id: g.id, title: g.title }));
			}
		} catch {
			/* leave games empty — picker just shows an empty state */
		} finally {
			gamesLoaded = true;
		}
	}

	function attach(g: MyGame) {
		attached = g;
		showPicker = false;
	}
	function detach() {
		attached = null;
	}

	function saveName() {
		const clean = nameDraft.trim();
		if (!clean) return;
		setPlayerName(clean);
		syncName();
		nameNeeded = false;
		// Continue straight into posting the pending text.
		void submit();
	}

	async function submit() {
		error = '';
		if (!canPost) return;

		syncName();
		if (!name) {
			// First post: capture a display name, then this same submit resumes.
			nameDraft = '';
			nameNeeded = true;
			return;
		}

		const uid = getUid();
		if (!uid) {
			error = 'Could not identify this browser. Try reloading.';
			return;
		}

		posting = true;
		try {
			const res = await fetch('/api/posts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					uid,
					author: name,
					text: text.trim(),
					gameId: attached?.id,
					gameTitle: attached?.title,
					link: link.trim() || undefined
				})
			});
			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.success || !data?.post) {
				error = data?.error || 'Could not post. Try again.';
				return;
			}
			// Reset composer and hand the new post up.
			text = '';
			link = '';
			attached = null;
			onposted?.(data.post as Post);
		} catch {
			error = 'Network error — could not post.';
		} finally {
			posting = false;
		}
	}
</script>

<div class="border-b border-base-300 px-4 py-4">
	{#if nameNeeded}
		<!-- Name gate: first-time posters pick a display name -->
		<form
			onsubmit={(e) => {
				e.preventDefault();
				saveName();
			}}
			class="flex flex-col gap-3"
		>
			<p class="text-sm font-semibold text-base-content">Pick a name to post as</p>
			<input
				type="text"
				bind:value={nameDraft}
				maxlength="24"
				placeholder="Your display name"
				class="input input-bordered w-full"
			/>
			<div class="flex items-center justify-end gap-2">
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					onclick={() => (nameNeeded = false)}
				>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary btn-sm" disabled={!nameDraft.trim()}>
					Save & post
				</button>
			</div>
		</form>
	{:else}
		<!-- How-to: anyone can post; spell out the three things a post can carry. -->
		<p class="mb-3 flex items-start gap-1.5 text-xs leading-relaxed text-base-content/55">
			<Icon icon="lucide:info" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
			<span>Anyone can post to the feed — write a message, attach a game, and/or paste any link (https://…). Your post shows up in the scroll feed for everyone.</span>
		</p>
		<div class="flex gap-3">
			<div
				class="mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-base-300 text-base-content/50"
				aria-hidden="true"
			>
				<Icon icon="lucide:user" class="h-5 w-5" />
			</div>

			<div class="min-w-0 flex-1">
				<textarea
					bind:value={text}
					maxlength={MAX + 200}
					rows="2"
					placeholder="What's happening on Kazwire?"
					class="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-base-content placeholder:text-base-content/40 focus:outline-none focus:ring-0"
					onkeydown={(e) => {
						if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
					}}
				></textarea>

				<!-- Attached game chip -->
				{#if attached}
					<div
						class="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-sm font-semibold text-primary"
					>
						<Icon icon="lucide:gamepad-2" class="h-4 w-4" />
						<span class="max-w-[12rem] truncate">{attached.title}</span>
						<button
							type="button"
							onclick={detach}
							class="grid h-6 w-6 place-items-center rounded-full hover:bg-primary/20"
							aria-label="Remove attached game"
						>
							<Icon icon="lucide:x" class="h-4 w-4" />
						</button>
					</div>
				{/if}

				<!-- Optional link: anyone can attach their own URL to a post -->
				<label class="mt-2 flex items-center gap-2 rounded-xl bg-base-200 px-3 py-2 ring-1 ring-base-300 focus-within:ring-2 focus-within:ring-primary">
						<Icon icon="lucide:link" class="h-4 w-4 shrink-0 text-base-content/50" />
						<input
							type="url"
							inputmode="url"
							bind:value={link}
							placeholder="Add a link (optional) — https://…"
							class="w-full bg-transparent text-sm text-base-content placeholder:text-base-content/40 focus:outline-none"
						/>
					</label>

					<!-- Game picker panel -->
				{#if showPicker}
					<div class="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-base-300 bg-base-200">
						{#if !gamesLoaded}
							<div class="flex items-center gap-2 px-4 py-3 text-sm text-base-content/50">
								<span class="loading loading-spinner loading-xs"></span>
								Loading your games…
							</div>
						{:else if games.length === 0}
							<div class="px-4 py-3 text-sm text-base-content/50">
								No games of yours yet — make one in the AI game maker.
							</div>
						{:else}
							{#each games as g (g.id)}
								<button
									type="button"
									onclick={() => attach(g)}
									class="flex w-full items-center gap-3 border-b border-base-300 px-4 py-2.5 text-left last:border-b-0 hover:bg-base-300"
								>
									<Icon icon="lucide:gamepad-2" class="h-4 w-4 shrink-0 text-primary" />
									<span class="truncate text-sm text-base-content">{g.title}</span>
								</button>
							{/each}
						{/if}
					</div>
				{/if}

				{#if error}
					<p class="mt-2 flex items-center gap-1.5 text-sm text-error">
						<Icon icon="lucide:alert-circle" class="h-4 w-4 shrink-0" />
						{error}
					</p>
				{/if}

				<!-- Action bar -->
				<div class="mt-3 flex items-center justify-between">
					<button
						type="button"
						onclick={loadGames}
						class="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
						aria-expanded={showPicker}
					>
						<Icon icon="lucide:gamepad-2" class="h-4 w-4" />
						Attach a game
					</button>

					<div class="flex items-center gap-3">
						<span
							class="text-xs tabular-nums {overLimit
								? 'font-bold text-error'
								: remaining <= 50
									? 'text-warning'
									: 'text-base-content/40'}"
						>
							{remaining}
						</span>
						<button
							type="button"
							onclick={submit}
							disabled={!canPost}
							class="btn btn-primary btn-sm rounded-full px-5"
						>
							{#if posting}
								<span class="loading loading-spinner loading-xs"></span>
							{/if}
							Post
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
