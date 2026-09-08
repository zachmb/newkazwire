<script lang="ts">
	import Icon from '@iconify/svelte';
</script>

<a
	href="/ai"
	class="group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-box bg-accent text-base-content transition-colors hover:bg-yellow-400"
	aria-label="Open AI"
>
	<Icon
		icon="lucide:bot"
		class="h-12 w-12 stroke-2 transition-transform duration-200 group-hover:scale-110"
	/>
	<span class="text-xl font-black uppercase tracking-wider">AI</span>
</a>
