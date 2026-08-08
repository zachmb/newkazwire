<script lang="ts">
	import { userProfile } from '$lib/stores/userProfile';
	import Icon from '@iconify/svelte';

	export let title: string;
	export let image: string;
	export let href: string;
	/** Always-visible title bar for readability (default on). */
	export let showTitle = true;

	$: gameId = href.split('/').pop() || '';
	$: isFavorite = $userProfile.favoriteGames.includes(gameId);

	function toggleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (gameId) userProfile.toggleFavorite(gameId);
	}
</script>

<a
	{href}
	class="group relative block h-full w-full overflow-hidden rounded-2xl bg-base-300 shadow-md ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
	aria-label={title}
>
	<!-- Image fills the parent cell (works in bento + aspect wrappers) -->
	<img
		src={image}
		alt={title}
		loading="lazy"
		decoding="async"
		class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
	/>

	<!-- Favorite -->
	<button
		class="absolute right-2 top-2 z-20 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-all hover:bg-black/60 {isFavorite
			? 'opacity-100'
			: 'opacity-0 group-hover:opacity-100'}"
		on:click={toggleFavorite}
		title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
		aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
	>
		<Icon icon={isFavorite ? 'mdi:heart' : 'mdi:heart-outline'} class="text-lg {isFavorite ? 'text-red-500' : ''}" />
	</button>

	<!-- Play affordance on hover -->
	<div class="pointer-events-none absolute inset-0 grid place-items-center transition-colors duration-200 group-hover:bg-black/25">
		<div class="grid h-14 w-14 translate-y-2 place-items-center rounded-full bg-primary text-white opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
			<Icon icon="mdi:play" class="text-3xl" />
		</div>
	</div>

	{#if showTitle}
		<!-- Always-visible, high-contrast title bar -->
		<div class="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-6">
			<span class="block truncate text-sm font-bold text-white drop-shadow">{title}</span>
		</div>
	{/if}
</a>
