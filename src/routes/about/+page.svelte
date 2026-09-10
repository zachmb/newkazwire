<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import Cloak from '$lib/components/Cloak.svelte';

	// Brand identity everywhere is just the current domain (cloaked).
	$: host = $page.url.hostname;

	const stats = [
		{ value: '130+', label: 'Games' },
		{ value: '100%', label: 'Free' },
		{ value: '0', label: 'Downloads' }
	];
	const values = [
		{ icon: 'mdi:flash', title: 'Blazing fast', body: 'Games stream from a global bucket and load instantly — no installs, no waiting.' },
		{ icon: 'mdi:shield-lock', title: 'Playable anywhere', body: 'A built-in private browser keeps the whole library reachable on any network.' },
		{ icon: 'mdi:sparkles', title: 'Made by the community', body: 'Anyone can build a game with AI and publish it to the library in seconds.' }
	];
</script>

<svelte:head>
	<meta name="description" content="About {$page.url.hostname} — a comprehensive gaming platform offering a variety of free browser games for players of all ages." />
</svelte:head>

<div class="kz-page">
	<!-- Hero -->
	<div class="relative overflow-hidden rounded-box border border-base-content/10 bg-neutral p-8 text-center text-white shadow-sm sm:p-14">
		<img src="/logo.png" alt="" class="mx-auto mb-5 h-20 w-20 rounded-xl object-contain ring-1 ring-white/20" />
		<p class="kz-eyebrow text-white/50">Company</p>
		<h1 class="mt-2 text-4xl font-black tracking-tight sm:text-5xl">About <Cloak text={host} /></h1>
		<p class="mx-auto mt-4 max-w-xl text-lg font-medium text-white/70">
			{config.branding.slogan} A comprehensive gaming platform — free to play, right in your browser.
		</p>
		<div class="mx-auto mt-8 grid max-w-md grid-cols-3 gap-4">
			{#each stats as s}
				<div class="rounded-xl border border-white/10 bg-white/10 p-4">
					<div class="text-2xl font-black text-primary">{s.value}</div>
					<div class="text-xs font-bold uppercase tracking-wider text-white/70">{s.label}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Body -->
	<div class="mt-10 space-y-5 text-lg leading-relaxed text-base-content/60">
		<h2 class="text-2xl font-black tracking-tight text-base-content">
			<Cloak text={host} /> — a comprehensive gaming platform
		</h2>
		<p>
			<Cloak text={host} /> is a comprehensive gaming platform that offers a wide variety of exciting
			games for players of all ages. The site aims to provide every visitor with a fun and
			entertaining experience, whether they are looking for simple, easy-to-play games or more
			challenging and complex titles.
		</p>
		<p>
			One of the strengths of the platform is that it caters to a broad range of interests and
			preferences. Whether you enjoy fast-paced action games, brain-teasing puzzles, classic
			arcade titles, or engaging simulations, you are sure to find something that will keep you
			entertained for hours. The library is regularly updated with new games — including games
			created by the community itself with our built-in AI game creator — so there is always
			something fresh and exciting to try.
		</p>
		<p>
			The site features a clean, user-friendly interface that makes it easy to browse and navigate
			the full selection of games, and every game is free to play. There are no downloads, no
			installs, and no accounts required — every title runs directly in your browser and loads in
			seconds. This makes the platform an accessible and convenient option for anyone who wants to
			enjoy their favorite games without any hassle.
		</p>
		<p>
			Beyond the game library, the platform includes a community feed, multiplayer rooms, public
			player profiles, and a play-money economy — everything you need to play together, not just
			alone. Overall, it is a fantastic destination for anyone looking for an entertaining and
			engaging gaming experience.
		</p>
	</div>

	<!-- About / founded -->
	<div class="kz-card mt-10 p-6 sm:p-8">
		<h2 class="text-xl font-black tracking-tight text-base-content">About <Cloak text={host} /></h2>
		<p class="mt-3 leading-relaxed text-base-content/60">
			<Cloak text={host} />, founded in 2026, is a comprehensive gaming platform whose goal is to
			bring more interesting gaming experiences to more players. For more information about
			<Cloak text={host} />, you can
			<a href="/contact" class="font-semibold text-primary hover:underline">contact us</a> — or read
			our
			<a href="/legal/privacy-policy" class="font-semibold text-primary hover:underline">Privacy Policy</a>
			and
			<a href="/legal/terms-of-service" class="font-semibold text-primary hover:underline">Terms of Use</a>.
		</p>
	</div>

	<!-- Values -->
	<div class="mt-10 grid gap-5 sm:grid-cols-3">
		{#each values as v}
			<div class="rounded-box border border-base-content/10 bg-base-200 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
				<div class="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
					<Icon icon={v.icon} class="text-2xl" />
				</div>
				<h3 class="text-lg font-black text-base-content">{v.title}</h3>
				<p class="mt-1 text-sm leading-relaxed text-base-content/60">{v.body}</p>
			</div>
		{/each}
	</div>

	<!-- CTA -->
	<div class="mt-10 flex flex-wrap justify-center gap-3">
		<a href="/" class="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
			<Icon icon="mdi:play" class="text-xl" /> Start playing
		</a>
		<a href="/ai" class="flex items-center gap-2 rounded-full border border-base-content/10 bg-base-200 px-6 py-3 font-bold text-base-content transition hover:-translate-y-0.5 hover:shadow-md">
			<Icon icon="mdi:sparkles" class="text-xl text-primary" /> Make a game
		</a>
	</div>
</div>
