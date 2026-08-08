<script lang="ts">
	import Icon from '@iconify/svelte';
</script>

<a
	href="https://docs.google.com/forms/d/e/1FAIpQLScvGNBsBX518mWLra1_iGa9IyCKU1ncV9ykUYngJ4S3xZOjqw/viewform"
	target="_blank"
	rel="noopener noreferrer"
	class="group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-accent text-base-content transition-colors hover:bg-yellow-400"
	aria-label="Request a Game"
>
	<Icon
		icon="lucide:plus"
		class="h-12 w-12 stroke-2 transition-transform duration-200 group-hover:scale-110"
	/>
	<span class="text-xl font-black uppercase tracking-wider">Add Game</span>

	<!-- Shiny effect -->
	<div
		class="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-tr from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
	/>
</a>
