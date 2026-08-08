<script lang="ts">
	import GameCard from './GameCard.svelte';
	import Icon from '@iconify/svelte';

	export let title: string;
	export let icon: string | null = null;
	export let games: { title: string; image: string; href: string }[] = [];
	export let seeAllHref: string | null = null;

	let scroller: HTMLDivElement;

	function scrollBy(dir: 1 | -1) {
		if (!scroller) return;
		scroller.scrollBy({ left: dir * Math.round(scroller.clientWidth * 0.85), behavior: 'smooth' });
	}
</script>

{#if games.length}
	<section class="flex flex-col gap-3">
		<div class="flex items-end justify-between px-1">
			<h2 class="flex items-center gap-2 text-xl font-black tracking-tight text-base-content sm:text-2xl">
				{#if icon}<Icon {icon} class="text-2xl text-primary" />{/if}
				{title}
			</h2>
			<div class="flex items-center gap-1">
				{#if seeAllHref}
					<a href={seeAllHref} class="mr-1 text-sm font-bold text-primary hover:underline">View all</a>
				{/if}
				<button
					class="grid h-9 w-9 place-items-center rounded-full bg-base-300 text-base-content transition hover:bg-primary hover:text-white"
					on:click={() => scrollBy(-1)}
					aria-label="Scroll left"
				>
					<Icon icon="mdi:chevron-left" class="text-xl" />
				</button>
				<button
					class="grid h-9 w-9 place-items-center rounded-full bg-base-300 text-base-content transition hover:bg-primary hover:text-white"
					on:click={() => scrollBy(1)}
					aria-label="Scroll right"
				>
					<Icon icon="mdi:chevron-right" class="text-xl" />
				</button>
			</div>
		</div>

		<div
			bind:this={scroller}
			class="row-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
		>
			{#each games as game (game.href)}
				<div class="aspect-square w-36 flex-none snap-start sm:w-40 md:w-44">
					<GameCard title={game.title} image={game.image} href={game.href} />
				</div>
			{/each}
		</div>
	</section>
{/if}

<style>
	.row-scroll {
		scrollbar-width: none;
	}
	.row-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
