<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { LocalAiGame } from '$lib/stores/localAiGames';

	const dispatch = createEventDispatcher<{ open: LocalAiGame; remix: LocalAiGame }>();

	/**
	 * A saved AI game from the player's local library, rendered as a proper card:
	 * cover placeholder art, title, created date, and Open + Remix actions.
	 * The card is UI-only — Open/Remix are emitted for the page to handle so the
	 * existing generate/remix flow stays the single source of truth.
	 */
	export let game: LocalAiGame;

	$: dateLabel = (() => {
		try {
			return new Date(game.createdAt).toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				year: 'numeric'
			});
		} catch {
			return '';
		}
	})();
</script>

<div class="group flex flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100 transition-all hover:border-primary/40 hover:shadow-lg">
	<button
		type="button"
		class="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-base-200"
		on:click={() => dispatch('open', game)}
		aria-label={`Open ${game.title}`}
	>
		<Icon
			icon="mdi:gamepad-variant"
			class="text-5xl text-base-content/20 transition-transform group-hover:scale-110"
		/>
		<span
			class="absolute inset-0 flex items-center justify-center bg-primary/0 opacity-0 transition-all group-hover:bg-primary/10 group-hover:opacity-100"
		>
			<span class="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-content shadow-lg">
				<Icon icon="mdi:play" class="text-base" /> Play
			</span>
		</span>
	</button>

	<div class="flex flex-1 flex-col gap-3 p-4">
		<div class="min-w-0">
			<h4 class="line-clamp-1 font-black text-base-content" title={game.title}>{game.title}</h4>
			<p class="mt-0.5 flex items-center gap-1 text-xs text-base-content/50">
				<Icon icon="mdi:calendar-blank-outline" class="text-sm" />
				{dateLabel}
			</p>
		</div>

		<div class="mt-auto flex gap-2">
			<button
				type="button"
				class="btn btn-primary btn-sm flex-1 rounded-xl font-bold"
				on:click={() => dispatch('open', game)}
			>
				<Icon icon="mdi:play" />
				Open
			</button>
			<button
				type="button"
				class="btn btn-ghost btn-sm flex-1 rounded-xl font-bold"
				on:click={() => dispatch('remix', game)}
			>
				<Icon icon="mdi:refresh" />
				Remix
			</button>
		</div>
	</div>
</div>
