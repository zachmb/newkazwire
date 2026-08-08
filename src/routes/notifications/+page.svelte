<script lang="ts">
	import { onMount } from 'svelte';
	import GameRail from '$lib/components/GameRail.svelte';
	import { games } from '$lib/data/games';
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
	import { getCDNImageUrl } from '$lib/utils/cdn';

	$: mappedGames = games.map((g) => ({
		...g,
		image: getCDNImageUrl(g.image)
	}));

	onMount(() => {
		window.scrollTo(0, 0);
	});

	// Mock changelog data
	const updates = [
		{
			date: 'Feb 17, 2026',
			version: 'v2.2.0',
			title: 'Database Integration',
			description:
				'Games are now dynamically pulled from our database, ensuring faster load times and real-time updates for all content.',
			tags: ['Backend', 'Database'],
			type: 'feature'
		},
		{
			date: 'Feb 15, 2026',
			version: 'v2.1.0',
			title: 'Performance Improvements',
			description:
				'We have optimized the game loading times and fixed some minor bugs in the backend.',
			tags: ['Performance', 'Fix'],
			type: 'improvement'
		},
		{
			date: 'Feb 10, 2026',
			version: 'v2.0.5',
			title: 'New Games Added',
			description:
				'Added 5 new puzzle games to the collection. Check them out in the strategy section!',
			tags: ['New Content', 'Games'],
			type: 'feature'
		},
		{
			date: 'Jan 28, 2026',
			version: 'v2.0.0',
			title: 'Major UI Overhaul',
			description:
				'Complete redesign of the user interface for a better experience on mobile devices.',
			tags: ['UI/UX', 'Major'],
			type: 'feature'
		}
	];

	function getTypeColor(type: string) {
		switch (type) {
			case 'feature':
				return 'bg-blue-100 text-blue-800';
			case 'improvement':
				return 'bg-blue-100 text-blue-800';
			case 'fix':
				return 'bg-orange-100 text-orange-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<svelte:head>
	<title>{config.branding.name} - Updates</title>
</svelte:head>

<div class="font-sans min-h-screen bg-[#5B9BFF] p-4 text-neutral">
	<div class="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 lg:grid-cols-[1fr_5fr_2fr]">
		<!-- Left Rail -->
		<aside class="hidden h-full lg:block">
			<GameRail games={mappedGames} />
		</aside>

		<!-- Main Content -->
		<main class="flex flex-col gap-6">
			<div class="rounded-3xl bg-white p-8 shadow-sm">
				<div class="mb-8 flex items-center justify-between">
					<div>
						<h1 class="text-4xl font-black text-[#0B1B33]">Changelog</h1>
						<p class="mt-2 text-lg text-neutral/60">Latest updates, features, and improvements.</p>
					</div>
					<div class="hidden md:block">
						<Icon icon="lucide:sparkles" class="h-12 w-12 text-[#5B9BFF]" />
					</div>
				</div>

				<div
					class="relative space-y-8 pl-8 before:absolute before:left-[11px] before:top-2 before:h-full before:w-[2px] before:bg-gray-200"
				>
					{#each updates as update}
						<div class="relative">
							<!-- Dot -->
							<div
								class="absolute -left-[29px] top-1.5 h-6 w-6 rounded-full border-4 border-white bg-[#5B9BFF] shadow-sm"
							/>

							<div
								class="flex flex-col gap-2 rounded-2xl border border-neutral/5 bg-neutral/[0.02] p-6 transition-colors hover:bg-neutral/[0.04]"
							>
								<div class="flex flex-wrap items-center gap-3">
									<span class="font-mono text-sm font-bold text-neutral/50">{update.date}</span>
									<span
										class="rounded-full bg-neutral/10 px-2 py-0.5 text-xs font-bold text-neutral/60"
										>{update.version}</span
									>
									{#each update.tags as tag}
										<span
											class="rounded-full px-2 py-0.5 text-xs font-bold {getTypeColor(update.type)}"
											>{tag}</span
										>
									{/each}
								</div>

								<h3 class="text-2xl font-bold text-[#0B1B33]">{update.title}</h3>
								<p class="text-lg leading-relaxed text-neutral/80">
									{update.description}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</main>

		<!-- Right Column -->
		<aside class="flex flex-col gap-6">
			<div class="flex flex-col gap-4">
				<h3 class="px-2 text-lg font-black text-white drop-shadow-sm">Recommended</h3>
				<div class="grid grid-cols-2 gap-3">
					{#each mappedGames.slice(0, 6) as game}
						<a
							href={game.href}
							class="group relative aspect-square w-full overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:scale-105 hover:shadow-lg"
						>
							<img src={game.image} alt={game.title} class="h-full w-full object-cover" />
							<div
								class="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
							>
								<span class="block truncate text-[10px] font-bold text-white">
									{game.title}
								</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		</aside>
	</div>
</div>
