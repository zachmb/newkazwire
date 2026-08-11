<script lang="ts">
	/**
	 * CommunityNotes — self-contained, X/Community-Notes-style reader context for a game.
	 *
	 * Give it a `gameId`; it loads its own notes (server returns them most-helpful first),
	 * renders a name-gated composer, and a list of notes with Helpful / Not helpful vote
	 * buttons + counts. The top note whose (helpful − notHelpful) score is >= 2 is promoted
	 * to a highlighted "Community Note" card — icon + "Readers added context".
	 *
	 * Design grounded in Particle News' community-context card
	 * (mobbin.com/screens/e23e0486-55c1-435d-a8a9-db81c427a9af): a bordered card with a
	 * left accent rule and a source label reading "readers added context" — and komoot's
	 * Tips thumbs-up / thumbs-down helpful vote with counts
	 * (mobbin.com/screens/9f6834b0-98fd-4393-a3d5-c66f6235693e). Recolored to Kazwire's
	 * brand primary + daisyUI tokens (light/dark safe). User text uses `{text}` (auto-escaped).
	 */
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { getUid, getPlayerName, setPlayerName } from '$lib/utils/streak';

	/**
	 * Whether the visitor has actually chosen a name. `getPlayerName()` falls back to
	 * 'Anonymous' when unset, so read the raw key to decide whether to show the name-gate.
	 */
	function storedName(): string {
		if (typeof window === 'undefined') return '';
		try {
			return (localStorage.getItem('kazwire_player_name') || '').trim();
		} catch {
			return '';
		}
	}

	interface Note {
		id: string;
		uid: string;
		author: string;
		text: string;
		createdAt: string | number;
		helpful: number;
		notHelpful: number;
	}

	export let gameId: string;

	let notes: Note[] = [];
	let loading = true;
	let failed = false;

	// Composer
	let nameInput = '';
	let hasName = false;
	let draft = '';
	let posting = false;
	let composerError = '';
	let showComposer = false;

	// Remember which notes this browser voted on (session) so a re-tap is a no-op.
	let voted: Record<string, boolean> = {};

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
			const res = await fetch(`/api/notes?gameId=${encodeURIComponent(gameId)}`);
			const data = await res.json();
			if (res.ok && Array.isArray(data?.notes)) {
				notes = data.notes;
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

	async function postNote() {
		const text = draft.trim();
		if (!text || posting) return;
		if (!hasName) {
			composerError = 'Pick a name first.';
			return;
		}
		posting = true;
		composerError = '';
		try {
			const res = await fetch('/api/notes', {
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
			if (!res.ok || !data?.note) {
				composerError = data?.error || 'Could not add your note.';
				return;
			}
			notes = [...notes, data.note];
			draft = '';
			showComposer = false;
		} catch {
			composerError = 'Network error — try again.';
		} finally {
			posting = false;
		}
	}

	async function vote(noteId: string, kind: 'helpful' | 'notHelpful') {
		if (voted[noteId]) return;
		voted = { ...voted, [noteId]: true };

		// Optimistic bump.
		notes = notes.map((n) =>
			n.id === noteId
				? {
						...n,
						helpful: kind === 'helpful' ? n.helpful + 1 : n.helpful,
						notHelpful: kind === 'notHelpful' ? n.notHelpful + 1 : n.notHelpful
					}
				: n
		);

		try {
			const res = await fetch('/api/notes/vote', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ gameId, noteId, vote: kind })
			});
			const data = await res.json();
			if (res.ok && data?.note) {
				const srv = data.note as Note;
				notes = notes.map((n) => (n.id === noteId ? { ...n, ...srv } : n));
			}
		} catch {
			// Keep optimistic value.
		}
	}

	function score(n: Note): number {
		return (n.helpful ?? 0) - (n.notHelpful ?? 0);
	}

	/** The single note to promote to the highlighted card: top note with score >= 2. */
	// Server sorts most-helpful first, so notes[0] is the candidate; guard on threshold.
	let topNote: Note | null = null;
	let restNotes: Note[] = [];
	$: {
		topNote = notes.length && score(notes[0]) >= 2 ? notes[0] : null;
		const promotedId = topNote?.id;
		restNotes = promotedId ? notes.filter((n) => n.id !== promotedId) : notes;
	}

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
</script>

<section class="rounded-3xl bg-base-100 p-6 shadow-xl sm:p-8">
	<div class="mb-1 flex items-center gap-2">
		<Icon icon="mdi:note-text-outline" class="text-2xl text-primary" />
		<h3 class="text-2xl font-black text-base-content">Community Notes</h3>
	</div>
	<p class="mb-5 text-sm text-base-content/60">
		Readers add context — quirks, fixes, and things to know before you play.
	</p>

	<!-- Highlighted top note -->
	{#if topNote}
		<div class="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
			<div class="mb-2 flex items-center gap-2">
				<Icon icon="mdi:account-group" class="text-lg text-primary" />
				<span class="text-xs font-black uppercase tracking-wider text-primary">
					Readers added context
				</span>
			</div>
			<p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-base-content/90">
				{topNote.text}
			</p>
			<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-base-content/50">
				<a href="/u/{topNote.uid}" class="font-bold text-base-content/70 hover:text-primary hover:underline"
					>{topNote.author}</a
				>
				<span>· {timeAgo(topNote.createdAt)}</span>
				<span class="flex items-center gap-1 font-semibold text-primary">
					<Icon icon="mdi:thumb-up" class="text-sm" />
					{topNote.helpful} found this helpful
				</span>
			</div>
			<div class="mt-3 flex items-center gap-2">
				<button
					class="btn btn-sm gap-1 {voted[topNote.id] ? 'btn-primary text-white' : 'btn-outline'}"
					on:click={() => topNote && vote(topNote.id, 'helpful')}
					disabled={voted[topNote.id]}
				>
					<Icon icon="mdi:thumb-up-outline" /> Helpful
					<span class="tabular-nums">{topNote.helpful}</span>
				</button>
				<button
					class="btn btn-sm btn-ghost gap-1 text-base-content/60"
					on:click={() => topNote && vote(topNote.id, 'notHelpful')}
					disabled={voted[topNote.id]}
				>
					<Icon icon="mdi:thumb-down-outline" /> Not helpful
					<span class="tabular-nums">{topNote.notHelpful}</span>
				</button>
			</div>
		</div>
	{/if}

	<!-- Add-a-note toggle / composer -->
	<div class="mb-6">
		{#if !showComposer}
			<button class="btn btn-outline btn-primary btn-sm gap-1" on:click={() => (showComposer = true)}>
				<Icon icon="mdi:plus" /> Add a note
			</button>
		{:else}
			<div class="rounded-2xl bg-base-200 p-4">
				{#if !hasName}
					<label class="mb-2 block text-sm font-bold text-base-content/70" for="cn-name">
						Pick a name to add a note
					</label>
					<div class="flex gap-2">
						<input
							id="cn-name"
							class="input input-bordered w-full flex-1"
							placeholder="Your name"
							maxlength="24"
							bind:value={nameInput}
							on:keydown={(e) => e.key === 'Enter' && saveName()}
						/>
						<button
							class="btn btn-primary font-bold text-white"
							on:click={saveName}
							disabled={!nameInput.trim()}>Save</button
						>
					</div>
				{:else}
					<div class="mb-2 text-sm text-base-content/60">
						Adding a note as <span class="font-bold text-base-content">{getPlayerName()}</span>
					</div>
					<textarea
						class="textarea textarea-bordered w-full"
						rows="3"
						maxlength="1000"
						placeholder="Add helpful context — a bug, a workaround, a tip…"
						bind:value={draft}
					></textarea>
					{#if composerError}
						<p class="mt-2 flex items-center gap-1 text-sm font-semibold text-error">
							<Icon icon="mdi:alert-circle-outline" /> {composerError}
						</p>
					{/if}
					<div class="mt-2 flex justify-end gap-2">
						<button class="btn btn-ghost btn-sm" on:click={() => (showComposer = false)}>Cancel</button>
						<button
							class="btn btn-primary btn-sm font-bold text-white"
							on:click={postNote}
							disabled={posting || !draft.trim()}
						>
							{#if posting}<Icon icon="line-md:loading-alt-loop" />{:else}Add note{/if}
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Remaining notes -->
	{#if loading}
		<ul class="space-y-3">
			{#each Array(2) as _}
				<li class="rounded-xl bg-base-200 p-4">
					<div class="mb-2 h-3 w-24 animate-pulse rounded bg-base-300"></div>
					<div class="h-3 w-full animate-pulse rounded bg-base-300"></div>
				</li>
			{/each}
		</ul>
	{:else if failed}
		<p class="rounded-xl bg-base-200 p-4 text-sm text-base-content/60">
			Couldn’t load notes right now. Try again in a bit.
		</p>
	{:else if notes.length === 0}
		<div class="flex flex-col items-center gap-2 rounded-xl bg-base-200 p-8 text-center">
			<Icon icon="mdi:note-plus-outline" class="text-3xl text-base-content/30" />
			<p class="text-sm font-semibold text-base-content/60">No notes yet.</p>
			<p class="text-xs text-base-content/40">Know something others should? Add the first note.</p>
		</div>
	{:else if restNotes.length}
		<ul class="space-y-3">
			{#each restNotes as n (n.id)}
				<li class="rounded-xl border border-base-200 p-4">
					<p class="whitespace-pre-wrap break-words text-sm leading-relaxed text-base-content/90">
						{n.text}
					</p>
					<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-base-content/50">
						<a href="/u/{n.uid}" class="font-bold text-base-content/70 hover:text-primary hover:underline"
							>{n.author}</a
						>
						<span>· {timeAgo(n.createdAt)}</span>
						<div class="ml-auto flex items-center gap-1.5">
							<button
								class="flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition-colors {voted[
									n.id
								]
									? 'text-primary'
									: 'text-base-content/60 hover:bg-primary/10 hover:text-primary'}"
								on:click={() => vote(n.id, 'helpful')}
								disabled={voted[n.id]}
								aria-label="Mark helpful"
							>
								<Icon icon="mdi:thumb-up-outline" /> <span class="tabular-nums">{n.helpful}</span>
							</button>
							<button
								class="flex items-center gap-1 rounded-full px-2 py-1 font-semibold transition-colors {voted[
									n.id
								]
									? 'text-base-content/60'
									: 'text-base-content/60 hover:bg-base-300'}"
								on:click={() => vote(n.id, 'notHelpful')}
								disabled={voted[n.id]}
								aria-label="Mark not helpful"
							>
								<Icon icon="mdi:thumb-down-outline" /> <span class="tabular-nums">{n.notHelpful}</span>
							</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
