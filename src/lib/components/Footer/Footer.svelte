<script lang="ts">
	import Icon from '@iconify/svelte';
	import { page } from '$app/stores';
	import Cloak from '$lib/components/Cloak.svelte';

	// Brand/copyright show the live domain (works on any mirror), cloaked.
	$: host = $page.url.hostname;

	const year = new Date().getFullYear();

	const columns = [
		{
			title: 'Explore',
			links: [
				{ label: 'Games', href: '/' },
				{ label: 'Apps', href: '/apps' },
				{ label: 'Study', href: '/study' },
				{ label: 'Create with AI', href: '/ai' },
				{ label: 'Community', href: '/ai/gallery' },
				{ label: 'Add your domain', href: '/portal' }
			]
		},
		{
			title: 'Company',
			links: [
				{ label: 'About', href: '/about' },
				{ label: 'Blog', href: '/blog' },
				{ label: 'Contact', href: '/contact' }
			]
		},
		{
			title: 'Legal',
			links: [
				{ label: 'Privacy Policy', href: '/legal/privacy-policy' },
				{ label: 'Terms of Service', href: '/legal/terms-of-service' },
				{ label: 'DMCA', href: '/legal/dmca' }
			]
		}
	];

	const socials = [
		{ icon: 'ic:baseline-discord', href: 'https://joinkaz.com', label: 'Discord' },
		{ icon: 'mdi:twitter', href: 'https://twitter.com', label: 'Twitter' },
		{ icon: 'mdi:github', href: 'https://github.com', label: 'GitHub' }
	];
</script>

<footer class="border-t border-base-300 bg-base-200 text-base-content">
	<div class="mx-auto grid w-full max-w-[1800px] gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5 lg:px-10">
		<!-- Brand -->
		<div class="flex flex-col gap-4 sm:col-span-2">
			<a href="/" class="flex items-center gap-3">
				<img src="/logo.png" alt="" class="h-11 w-11 rounded-xl object-contain" />
				<span class="text-2xl font-black tracking-tight"><Cloak text={host} /></span>
			</a>
			<p class="max-w-xs text-sm leading-relaxed text-base-content/60">
				A comprehensive gaming platform offering a variety of exciting games for players of all ages. Jump in and play — free, no downloads.
			</p>
			<div class="mt-1 flex gap-3">
				{#each socials as s}
					<a
						href={s.href}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={s.label}
						class="grid h-10 w-10 place-items-center rounded-btn bg-base-300 text-base-content/80 transition hover:bg-primary hover:text-primary-content"
					>
						<Icon icon={s.icon} class="text-xl" />
					</a>
				{/each}
			</div>
		</div>

		<!-- Link columns -->
		{#each columns as col}
			<nav class="flex flex-col gap-3">
				<span class="text-xs font-black uppercase tracking-widest text-base-content/40">{col.title}</span>
				{#each col.links as l}
					<a href={l.href} class="text-sm font-semibold text-base-content/70 transition hover:text-primary"><Cloak text={l.label} /></a>
				{/each}
			</nav>
		{/each}
	</div>

	<div class="border-t border-base-300">
		<div class="mx-auto flex w-full max-w-[1800px] flex-col items-center justify-between gap-2 px-6 py-5 text-sm sm:flex-row lg:px-10">
			<p class="font-semibold text-base-content/70">© {year} <Cloak text={host} /></p>
			<p class="text-base-content/40">Fast. Free. Just play.</p>
		</div>
	</div>
</footer>
