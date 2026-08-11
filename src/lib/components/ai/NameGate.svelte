<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import { setPlayerName } from '$lib/utils/streak';

	const dispatch = createEventDispatcher<{ saved: string }>();

	/**
	 * Inline name-capture card shown before a player can generate or upload a game.
	 * A player must set a display name (persisted via setPlayerName) — that name is
	 * sent as the public creator attribution on everything they publish.
	 *
	 * Emits `saved` with the trimmed name once a non-empty name is committed.
	 */
	export let heading = 'One quick thing — what should we call you?';
	export let sub = 'Your name is shown as the creator on every game you make and share.';

	let value = '';

	function save() {
		const clean = value.trim().slice(0, 24);
		if (!clean) return;
		setPlayerName(clean);
		dispatch('saved', clean);
	}
</script>

<div class="rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
	<div class="flex flex-col items-center gap-4 text-center">
		<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-content shadow-lg">
			<Icon icon="mdi:account-star" class="text-3xl" />
		</div>
		<div>
			<h3 class="text-xl font-black text-base-content">{heading}</h3>
			<p class="mt-1 text-sm text-base-content/60">{sub}</p>
		</div>
		<form class="flex w-full max-w-md flex-col gap-3 sm:flex-row" on:submit|preventDefault={save}>
			<input
				type="text"
				maxlength="24"
				placeholder="Your name"
				aria-label="Your display name"
				class="input input-bordered input-lg w-full rounded-2xl bg-base-100"
				bind:value
				on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
			/>
			<button
				type="submit"
				class="btn btn-primary btn-lg rounded-2xl font-black"
				disabled={!value.trim()}
			>
				Continue
				<Icon icon="mdi:arrow-right" class="text-xl" />
			</button>
		</form>
	</div>
</div>
