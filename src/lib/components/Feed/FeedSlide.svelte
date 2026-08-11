<!--
  FeedSlide.svelte — one full-screen game "slide" in the vertical swipe feed.

  Mobbin reference: TikTok "Watching videos" flow (iOS)
  https://mobbin.com/flows/c7203035-45cc-4ed9-aeb7-73626b6f6b4d
  Layout borrowed from TikTok's For You screen: full-bleed media, a heavy
  bottom scrim, the primary text stack pinned bottom-left (creator + title +
  attribution), a right-hand action rail, and a small chip up top.
-->
<script lang="ts">
	import Icon from '@iconify/svelte';

	type FeedItem = {
		kind: 'ai' | 'library' | 'post';
		title: string;
		image: string; // resolved cover/image URL
		href: string;
		creatorName: string;
		creatorLocation?: string;
		rating: number; // 0..5
		chip: string; // "AI" or a category
		postText?: string; // for kind === 'post'
		gameTitle?: string; // attached game title on a post
		likes?: number;
	};

	let {
		item,
		active = false,
		visible = true,
		navOffset = 0
	}: { item: FeedItem; active?: boolean; visible?: boolean; navOffset?: number } = $props();

	let imgLoaded = $state(false);
	let imgFailed = $state(false);

	// Only stars we actually earned; rounded to nearest half for display.
	const fullStars = $derived(Math.round(item.rating));
</script>

<section
	style="height: calc(100dvh - {navOffset}px)"
	class="relative w-full snap-start overflow-hidden bg-neutral text-neutral-content [scroll-snap-stop:always]"
	aria-roledescription="slide"
	aria-label={item.title}
>
	{#if item.kind === 'post'}
		<!-- POST slide: a community post surfaced inside the vertical game feed -->
		<div class="absolute inset-0 bg-gradient-to-br from-primary/25 via-neutral to-secondary/25"></div>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
		></div>

		<!-- Top chip -->
		<div class="absolute left-4 top-4 z-10 flex items-center gap-2 pt-[env(safe-area-inset-top)]">
			<span
				class="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm"
			>
				<Icon icon="lucide:message-square-text" class="h-3.5 w-3.5" />
				Post
			</span>
		</div>

		<!-- Centered post text -->
		<div class="absolute inset-0 flex items-center justify-center px-6">
			<p class="max-w-xl text-center text-2xl font-black leading-snug text-white drop-shadow-lg sm:text-3xl">
				{item.postText || item.title}
			</p>
		</div>

		<!-- Bottom stack: author + optional attached game -->
		<div
			class="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-4 pb-8 text-white pb-[calc(2rem+env(safe-area-inset-bottom))]"
		>
			<div class="flex items-center gap-2 text-sm font-semibold">
				<span class="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-content">
					<Icon icon="lucide:user" class="h-4 w-4" />
				</span>
				<span>{item.creatorName}</span>
			</div>

			{#if item.href && item.gameTitle}
				<a
					href={item.href}
					class="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-black uppercase tracking-wide text-primary-content shadow-xl transition-transform active:scale-95"
				>
					<Icon icon="lucide:play" class="h-5 w-5" />
					Play {item.gameTitle}
				</a>
			{/if}
		</div>
	{:else}
	<!-- Media (lazy: only paint when this slide is in the render window) -->
	{#if visible && item.image && !imgFailed}
		<img
			src={item.image}
			alt={item.title}
			loading="lazy"
			decoding="async"
			onload={() => (imgLoaded = true)}
			onerror={() => (imgFailed = true)}
			class="absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-700 ease-out {imgLoaded
				? 'scale-100 opacity-100'
				: 'scale-105 opacity-0'} {active ? 'motion-safe:scale-[1.04]' : ''}"
		/>
	{/if}

	<!-- Fallback / loading backdrop -->
	{#if !imgLoaded || imgFailed}
		<div
			class="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary/30 via-neutral to-secondary/30"
		>
			<Icon icon="lucide:gamepad-2" class="h-16 w-16 text-base-content/30" />
		</div>
	{/if}

	<!-- Scrims: darken top (for chip) and bottom (for text) so content stays legible -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent"
	></div>
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent"
	></div>

	<!-- Top chip -->
	<div class="absolute left-4 top-4 z-10 flex items-center gap-2 pt-[env(safe-area-inset-top)]">
		{#if item.kind === 'ai'}
			<span
				class="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-black uppercase tracking-wider text-primary-content shadow-lg"
			>
				<Icon icon="lucide:sparkles" class="h-3.5 w-3.5" />
				AI
			</span>
		{:else}
			<span
				class="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm"
			>
				{item.chip}
			</span>
		{/if}
	</div>

	<!-- Right action rail (TikTok-style vertical stack) -->
	<div
		class="absolute bottom-32 right-4 z-10 flex flex-col items-center gap-5 text-white sm:bottom-28"
	>
		<div class="flex flex-col items-center gap-1">
			<Icon icon="lucide:star" class="h-8 w-8 drop-shadow-md" />
			<span class="text-xs font-bold">{item.rating.toFixed(1)}</span>
		</div>
		<a
			href={item.href}
			class="flex flex-col items-center gap-1"
			aria-label="Play {item.title} now"
		>
			<span
				class="grid h-12 w-12 place-items-center rounded-full bg-secondary text-secondary-content shadow-lg transition-transform active:scale-90"
			>
				<Icon icon="lucide:play" class="h-6 w-6" />
			</span>
		</a>
	</div>

	<!-- Bottom text stack -->
	<div
		class="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 px-4 pb-8 pr-20 text-white pb-[calc(2rem+env(safe-area-inset-bottom))]"
	>
		<!-- Creator attribution -->
		<div class="flex items-center gap-2 text-sm font-semibold">
			<span class="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-content">
				<Icon
					icon={item.kind === 'ai' ? 'lucide:user' : 'lucide:code'}
					class="h-4 w-4"
				/>
			</span>
			<span>{item.creatorName}</span>
			{#if item.creatorLocation}
				<span class="text-white/60">·</span>
				<span class="inline-flex items-center gap-1 text-white/70">
					<Icon icon="lucide:map-pin" class="h-3.5 w-3.5" />
					{item.creatorLocation}
				</span>
			{/if}
		</div>

		<!-- Title -->
		<h2 class="text-3xl font-black leading-tight drop-shadow-lg">{item.title}</h2>

		<!-- Rating stars -->
		<div class="flex items-center gap-1" aria-label="Rated {item.rating.toFixed(1)} out of 5">
			{#each Array(5) as _, i (i)}
				<Icon
					icon={i < fullStars ? 'lucide:star' : 'lucide:star'}
					class="h-4 w-4 {i < fullStars ? 'text-primary' : 'text-white/25'}"
				/>
			{/each}
		</div>

		<!-- Primary PLAY button -->
		<a
			href={item.href}
			class="mt-3 flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black uppercase tracking-wide text-primary-content shadow-xl transition-transform active:scale-95"
		>
			<Icon icon="lucide:play" class="h-6 w-6" />
			Play
		</a>
	</div>
	{/if}
</section>
