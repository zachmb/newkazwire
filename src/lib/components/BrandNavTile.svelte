<script lang="ts">
	import { isSearchOpen } from '$lib/stores/search';

	function openSearch() {
		$isSearchOpen = true;
	}
</script>

<div
	class="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm"
>
	<!-- Top Section: Brand (Compact) -->
	<a
		href="/"
		data-sveltekit-reload
		class="flex h-[60%] flex-col items-center justify-center gap-1 bg-white p-2 no-underline transition-colors hover:bg-neutral/5"
	>
		<img src="/logo.png" alt="Kazwire" class="h-8 w-8 object-contain" />
		<h1 class="text-lg font-black lowercase leading-none tracking-tighter text-black sm:text-xl">
			kazwire.com
		</h1>
	</a>

	<!-- Bottom Section: Nav Buttons (Compact Split) -->
	<div class="flex h-[40%] border-t border-neutral/10">
		<!-- Account Button -->
		<a
			href="/account"
			class="group/btn relative flex flex-1 items-center justify-center rounded-bl-3xl bg-[#FF8A3D] transition-colors hover:bg-[#FF6A1A]"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				class="h-6 w-6 text-white drop-shadow-sm"
				><path
					fill="currentColor"
					d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4Z"
				/></svg
			>
			<div
				class="pointer-events-none absolute -top-12 z-50 rounded bg-black/80 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover/btn:opacity-100"
			>
				Account
			</div>
		</a>

		<!-- Search Button -->
		<button
			class="group/btn relative flex flex-1 items-center justify-center rounded-br-3xl border-l border-white/20 bg-[#FF8A3D] transition-colors hover:bg-[#FF6A1A]"
			on:click={openSearch}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				class="h-6 w-6 text-white drop-shadow-sm"
				><path
					fill="currentColor"
					d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.516 6.516 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5Z"
				/></svg
			>
			<div
				class="pointer-events-none absolute -top-12 z-50 rounded bg-black/80 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover/btn:opacity-100"
			>
				Search
			</div>
		</button>
	</div>
</div>
