<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
</script>

<footer
	class="footer overflow-hidden bg-gradient-to-b from-[#0B1B33] to-[#071022] p-10 text-white shadow-2xl"
>
	<div
		class="mx-auto flex w-full max-w-[1800px] flex-col items-center justify-between gap-10 md:flex-row"
	>
		<!-- Left: Branding -->
		<div class="flex flex-col items-center gap-4 md:items-start md:gap-6">
			<div class="flex items-center gap-4">
				<div
					class="h-16 w-16 overflow-hidden rounded-2xl shadow-lg ring-2 ring-[#5B9BFF]/30 transition-transform hover:scale-105"
				>
					<img src="/logo.png" alt="Kazwire" class="h-full w-full object-cover" />
				</div>
				<div>
					<p class="text-3xl font-black tracking-tight text-[#5B9BFF] drop-shadow-sm">
						{config.branding.name}
					</p>
					<p class="text-sm font-bold text-white/60">{config.branding.slogan}</p>
				</div>
			</div>
			<p class="max-w-xs text-center text-sm leading-relaxed text-white/50 md:text-left">
				The ultimate destination for unblocked games and interactive entertainment. Jump in and play!
			</p>
		</div>

		<!-- Center: Links -->
		<nav class="flex flex-col items-center gap-4 md:items-start">
			<span class="text-xs font-black uppercase tracking-widest text-[#5B9BFF]/60">Explore</span>
			<div
				class="flex flex-wrap justify-center gap-x-8 gap-y-3 text-base font-bold md:justify-start"
			>
				<a href="/" class="transition-colors hover:text-[#5B9BFF]">Home</a>
				<a href="/blog" class="transition-colors hover:text-[#5B9BFF]">Blog</a>
				<a href="/about" class="transition-colors hover:text-[#5B9BFF]">About</a>
				<a href="/legal/privacy-policy" class="transition-colors hover:text-[#5B9BFF]">Privacy</a>
				<a href="/legal/terms-of-service" class="transition-colors hover:text-[#5B9BFF]">Terms</a>
				<a href="/contact" class="transition-colors hover:text-[#5B9BFF]">Contact</a>
			</div>
		</nav>

		<!-- Right: Copyright -->
		<div class="flex flex-col items-center gap-4 md:items-end md:gap-6">
			<div class="flex gap-4">
				<a
					href="https://discord.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-[#5B9BFF]/20 hover:text-[#5B9BFF]"
				>
					<Icon icon="mdi:discord" class="text-xl" />
				</a>
				<a
					href="https://twitter.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-[#5B9BFF]/20 hover:text-[#5B9BFF]"
				>
					<Icon icon="mdi:twitter" class="text-xl" />
				</a>
				<a
					href="https://github.com"
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-all hover:bg-[#5B9BFF]/20 hover:text-[#5B9BFF]"
				>
					<Icon icon="mdi:github" class="text-xl" />
				</a>
			</div>
			<div class="text-center md:text-right">
				<p class="text-sm font-bold text-white/80">
					© {new Date().getFullYear()}
					{config.branding.name}
				</p>
				<p class="text-xs font-medium text-white/40">Proudly unblocked & faster than ever.</p>
			</div>
		</div>
	</div>
</footer>
