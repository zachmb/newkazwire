<script lang="ts">
	import Icon from '@iconify/svelte';
	import Cloak from '$lib/components/Cloak.svelte';
</script>

<a
	href="/study"
	class="group relative flex h-full w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl bg-accent text-base-content transition-colors hover:bg-yellow-400"
	aria-label="Open the private browser"
>
	<Icon
		icon="lucide:shield"
		class="h-12 w-12 stroke-2 transition-transform duration-200 group-hover:scale-110"
	/>
	<span class="text-xl font-black uppercase tracking-wider"><Cloak text="Study" /></span>

	<!-- Shinny effect -->
	<div
		class="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-tr from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]"
	></div>
</a>
