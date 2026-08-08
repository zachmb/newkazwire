<script lang="ts">
	import { userProfile } from '$lib/stores/userProfile';
	import Icon from '@iconify/svelte';

	export let title: string;
	export let image: string;
	export let href: string;

	let isHovered = false;
	// Mock video URL logic - ideally this comes from the game object
	// For now, we'll try to use a convention based on the ID or just fallback to image
	$: videoSrc = `/games/previews/${href.split('/').pop()}.mp4`;
	$: gameId = href.split('/').pop() || '';
	$: isFavorite = $userProfile.favoriteGames.includes(gameId);

	function toggleFavorite(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (gameId) userProfile.toggleFavorite(gameId);
	}

	function handleMouseEnter() {
		isHovered = true;
	}

	function handleMouseLeave() {
		isHovered = false;
	}
</script>

<a
	href={href}
	class="card-antigravity group relative block h-full w-full rounded-3xl"
	aria-label={title}
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
>
	<div class="navbar relative h-full w-full overflow-hidden bg-gray-200 shadow-md">
		<!-- Favorite Button -->
		<button
			class="btn btn-circle btn-sm absolute right-2 top-2 z-20 border-none bg-black/20 text-white transition-opacity duration-200 hover:bg-black/40 {isHovered ||
			isFavorite
				? 'opacity-100'
				: 'opacity-0'}"
			on:click={toggleFavorite}
			title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
		>
			<Icon
				icon={isFavorite ? 'mdi:heart' : 'mdi:heart-outline'}
				class="text-lg {isFavorite ? 'text-red-500' : ''}"
			/>
		</button>

		<!-- Static Image -->
		<img
			src={image}
			alt={title}
			loading="lazy"
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
		/>
	</div>
	<!-- Minimal overlay, only visible on hover if desired, or always visible for clarity -->
	<div
		class="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
	>
		<span class="block truncate text-xs font-bold text-white shadow-black drop-shadow-sm">
			{title}
		</span>
	</div>
</a>
