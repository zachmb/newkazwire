<script lang="ts">
	import { page } from '$app/stores';
	import { config } from '$lib/config';
</script>

<div class="hero mb-10 min-h-fit bg-base-100 font-heading">
	<div class="hero-content flex-col gap-24 lg:flex-row">
		<img
			src="/logo.png"
			alt="{$page.url.hostname} Logo"
			class="w-full max-w-sm rounded-box border border-base-content/10 shadow-sm"
		/>
		<div class="flex flex-col gap-6 text-base-content">
			<a href="/games">
				<h1
					class="text-5xl font-black uppercase tracking-tight transition-all hover:scale-[1.02] hover:text-secondary sm:text-8xl"
				>
					Games
				</h1>
			</a>
			<a href="/apps">
				<h1
					class="text-5xl font-black uppercase tracking-tight transition-all hover:scale-[1.02] hover:text-accent sm:text-8xl"
				>
					Apps
				</h1>
			</a>
			<a href="/search">
				<h1
					class="text-5xl font-black uppercase tracking-tight transition-all hover:scale-[1.02] hover:text-primary sm:text-8xl"
				>
					Browse
				</h1>
			</a>
		</div>
	</div>
</div>
