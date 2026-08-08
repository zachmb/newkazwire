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

	let gameId = '';
	$: if (game.embedURL) {
		// Try to extract ID from embed URL or image path if possible, or pass ID as prop
		// For now, let's assume we can get it from the window location or similar if we are playing
		// Actually, HeroGameCard is used on /[id]/ page so we likely have the ID in the route params
		// But here we only have the game object properties.
		// Let's rely on a check.
	}
	// Best approach: Add ID to the game prop definition

	// Temporary hack for context of this specific app:
	// We know it's used in /g/[id] page mostly.
	// But let's try to match it by name or use a prop in updated version.

	export let id: string = ''; // New prop

	$: isFavorite = $userProfile.favoriteGames.includes(id);

	export let playing = false;

	function startGame() {
		playing = true;
		dispatch('play');
	}
</script>

<div class="flex w-full flex-col overflow-hidden rounded-3xl bg-base-100 shadow-xl">
	<!-- Game Preview / Hero Area -->
	<div class="group relative aspect-video w-full bg-black">
		{#if playing}
			<div class="h-full w-full">
				<slot />
			</div>
		{:else}
			<!-- Thumbnail Image Area -->
			<div class="h-full w-full bg-base-100">
				<img
					src={game.image ? game.image : '/logo.png'}
					alt={game.name}
					class="h-full w-full object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-60"
				/>
			</div>

			<!-- Play Button Overlay -->
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
				<button
					class="btn btn-circle btn-primary btn-lg pointer-events-auto scale-100 shadow-2xl transition-transform duration-300 group-hover:scale-110"
					on:click={startGame}
					aria-label="Play Game"
				>
					<Icon icon="carbon:play-filled" class="h-10 w-10 text-white" />
				</button>
				<span
					class="mt-4 text-2xl font-black uppercase tracking-wide text-white drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
					>Play Now</span
				>
			</div>
		{/if}
	</div>

	<!-- Metadata Bar -->
	<div class="flex items-center justify-between bg-base-100 p-6">
		<div class="flex flex-col">
			<h1 class="text-3xl font-black tracking-tight text-base-content">{game.name}</h1>
			<p class="text-sm font-bold uppercase tracking-wider text-base-content/50">
				{game.developer || 'Kazwire'}
			</p>
		</div>

		<div class="flex items-center gap-4">
			<!-- Share -->
			<button
				class="btn btn-circle btn-neutral text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
				aria-label="Share"
				title="Share this game"
				on:click={() => dispatch('share')}
			>
				<Icon icon="material-symbols:ios-share" class="h-6 w-6" />
			</button>

			<!-- Fullscreen -->
			<button
				class="btn btn-circle btn-neutral text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
				aria-label="Fullscreen"
				title="Fullscreen"
				on:click={() => dispatch('fullscreen')}
			>
				<Icon icon="mdi:fullscreen" class="h-8 w-8" />
			</button>

			<button
				class="btn btn-circle btn-neutral text-white shadow-lg transition-transform hover:scale-110 hover:shadow-xl"
				aria-label="Favorite"
				title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
				on:click={() => {
					if (id) userProfile.toggleFavorite(id);
				}}
			>
				<Icon
					icon={isFavorite ? 'mdi:heart' : 'mdi:heart-outline'}
					class="h-6 w-6 {isFavorite ? 'text-red-500' : ''}"
				/>
			</button>
		</div>
	</div>
</div>
