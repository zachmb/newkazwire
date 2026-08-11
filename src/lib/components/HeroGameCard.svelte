<script lang="ts">
	import Icon from '@iconify/svelte';
	import { createEventDispatcher } from 'svelte';
	import { userProfile } from '$lib/stores/userProfile';

	const dispatch = createEventDispatcher();

	export let game: {
		name: string;
		developer: string;
		image: string | null;
		embedURL?: string;
		views?: number;
		likes?: number;
		dislikes?: number;
	};
	export let id: string = '';
	export let playing = false;
	/** Optional category tags shown in the metadata bar. */
	export let tags: string[] = [];

	$: isFavorite = $userProfile.favoriteGames.includes(id);

	function startGame() {
		playing = true;
		dispatch('play');
	}
</script>

<!-- Capped, centered player so EVERY game shows up at a consistent size (some games
     otherwise sprawled to the full column width on wide screens). aspect-video keeps a
     uniform 16:9 frame; max-w standardizes the footprint across all games. -->
<div class="mx-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-base-100 shadow-xl ring-1 ring-black/5">
	<!-- Game Preview / Hero Area -->
	<div class="group relative aspect-video w-full bg-black">
		{#if playing}
			<div class="h-full w-full">
				<slot />
			</div>
		{:else}
			<!-- Blurred backdrop + crisp poster -->
			{#if game.image}
				<img src={game.image} alt="" aria-hidden="true" class="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-50" />
			{/if}
			<img
				src={game.image ? game.image : '/logo.png'}
				alt={game.name}
				class="relative h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
			/>
			<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>

			<!-- Play button -->
			<div class="absolute inset-0 flex flex-col items-center justify-center gap-4">
				<button
					class="pointer-events-auto grid h-20 w-20 place-items-center rounded-full bg-primary text-white shadow-[0_0_40px_-5px] shadow-primary/70 transition-transform duration-300 hover:scale-110"
					on:click={startGame}
					aria-label="Play {game.name}"
				>
					<Icon icon="carbon:play-filled" class="h-10 w-10" />
				</button>
				<span class="text-2xl font-black uppercase tracking-wide text-white drop-shadow-lg">Play Now</span>
			</div>

			<!-- Title on poster -->
			<div class="pointer-events-none absolute inset-x-0 bottom-0 p-5">
				<h1 class="text-2xl font-black tracking-tight text-white drop-shadow sm:text-3xl">{game.name}</h1>
			</div>
		{/if}
	</div>

	<!-- Metadata Bar -->
	<div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
		<div class="flex min-w-0 flex-col gap-2">
			<h2 class="truncate text-2xl font-black tracking-tight text-base-content">{game.name}</h2>
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs font-bold uppercase tracking-wider text-base-content/50">{game.developer || 'Kazwire'}</span>
				{#each tags.slice(0, 3) as t}
					<span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{t}</span>
				{/each}
			</div>
		</div>

		<div class="flex flex-none items-center gap-2">
			<button
				class="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition {isFavorite ? 'bg-red-500/10 text-red-500' : 'bg-base-200 text-base-content hover:bg-base-300'}"
				aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
				on:click={() => { if (id) userProfile.toggleFavorite(id); }}
			>
				<Icon icon={isFavorite ? 'mdi:heart' : 'mdi:heart-outline'} class="text-lg" />
				<span class="hidden sm:inline">{isFavorite ? 'Favorited' : 'Favorite'}</span>
			</button>
			<button
				class="grid h-11 w-11 place-items-center rounded-full bg-base-200 text-base-content transition hover:bg-base-300"
				aria-label="Share" title="Share this game"
				on:click={() => dispatch('share')}
			>
				<Icon icon="material-symbols:ios-share" class="text-xl" />
			</button>
			<button
				class="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
				aria-label="Fullscreen" title="Fullscreen"
				on:click={() => dispatch('fullscreen')}
			>
				<Icon icon="mdi:fullscreen" class="text-xl" />
				<span class="hidden sm:inline">Fullscreen</span>
			</button>
		</div>
	</div>
</div>
