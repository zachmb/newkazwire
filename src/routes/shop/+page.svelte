<script lang="ts">
	import ItemShop from '$lib/components/ItemShop.svelte';
	import { config } from '$lib/config';
</script>


<div class="min-h-screen bg-base-100">
	<div class="mx-auto max-w-6xl px-4 py-6">
		<p class="mb-4 text-sm text-base-content/60">Earn Kazcoins by playing games. List your own items and earn from other players.</p>
		<ItemShop />
	</div>
</div>
