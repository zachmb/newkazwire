<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';

	const stats = [
		{ value: '130+', label: 'Games' },
		{ value: '100%', label: 'Free' },
		{ value: '0', label: 'Downloads' }
	];
	const values = [
		{ icon: 'mdi:flash', title: 'Blazing fast', body: 'Games stream from a global bucket and load instantly — no installs, no waiting.' },
		{ icon: 'mdi:shield-lock', title: 'Playable anywhere', body: 'A built-in private browser keeps the whole library reachable on any network.' },
		{ icon: 'mdi:sparkles', title: 'Made by the community', body: 'Anyone can build a game with AI and publish it to the Kazwire library in seconds.' }
	];
</script>

<svelte:head>
	<meta name="description" content="About {config.branding.name} — the best place to play free browser games." />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:py-16">
	<!-- Hero -->
	<div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1220] to-[#2563EB] p-8 text-center text-white sm:p-14">
		<img src="/logo.png" alt="" class="mx-auto mb-5 h-20 w-20 rounded-2xl object-contain ring-1 ring-white/20" />
		<h1 class="text-4xl font-black tracking-tight sm:text-5xl">About Kazwire</h1>
		<p class="mx-auto mt-4 max-w-xl text-lg font-medium text-white/80">
			{config.branding.slogan} The best place to play free browser games — anywhere.
		</p>
		<div class="mx-auto mt-8 grid max-w-md grid-cols-3 gap-4">
			{#each stats as s}
				<div class="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
					<div class="text-2xl font-black text-[#FF9F1C]">{s.value}</div>
					<div class="text-xs font-bold uppercase tracking-wider text-white/70">{s.label}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Body -->
	<div class="mt-10 space-y-5 text-lg leading-relaxed text-base-content/80">
		<p class="text-xl font-bold text-base-content">
			Kazwire exists for one reason: to let you play the games you love, wherever you are, without the hassle.
		</p>
		<p>
			No accounts, no downloads, no blocked pages. Every title runs right in your browser and loads in seconds. When a network gets in the way, our built-in private proxy gets you through it.
		</p>
	</div>

	<!-- Values -->
	<div class="mt-10 grid gap-5 sm:grid-cols-3">
		{#each values as v}
			<div class="rounded-2xl bg-base-200 p-6">
				<div class="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
					<Icon icon={v.icon} class="text-2xl" />
				</div>
				<h3 class="text-lg font-black text-base-content">{v.title}</h3>
				<p class="mt-1 text-sm leading-relaxed text-base-content/70">{v.body}</p>
			</div>
		{/each}
	</div>

	<!-- CTA -->
	<div class="mt-10 flex flex-wrap justify-center gap-3">
		<a href="/" class="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-black text-white transition hover:brightness-110">
			<Icon icon="mdi:play" class="text-xl" /> Start playing
		</a>
		<a href="/ai" class="flex items-center gap-2 rounded-full bg-base-200 px-6 py-3 font-bold text-base-content transition hover:bg-base-300">
			<Icon icon="mdi:sparkles" class="text-xl text-primary" /> Make a game
		</a>
	</div>
</div>
