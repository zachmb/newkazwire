<!--
  /feed — Twitter/X-style social feed for Kazwire: a composer at the top and a
  chronological list of community posts (which can optionally attach a game).
  The old TikTok-style vertical game swiper now lives at /feed/play, reachable
  from the tab bar below.

  Mobbin reference (design source): X (Twitter) home timeline — For You + composer (iOS)
  https://mobbin.com/screens/996603fa-1a10-4bc1-9431-030fa88848f2
  Borrowed: a sticky top bar with segmented tabs, a single-column centered
  timeline with hairline dividers between rows, avatar-left post rows, and a
  subdued action row. Kept token-driven so it reads cleanly in light + dark.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import PostComposer from '$lib/components/Feed/PostComposer.svelte';
	import PostCard from '$lib/components/Feed/PostCard.svelte';

	type Post = {
		id: string;
		uid: string;
		author: string;
		location?: string;
		text: string;
		gameId?: string;
		gameTitle?: string;
		createdAt: number | string;
		likes: number;
	};

	let posts = $state<Post[]>([]);
	let loading = $state(true);
	let loadError = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/posts?limit=100');
			const data = await res.json().catch(() => null);
			if (res.ok && data?.success && Array.isArray(data.posts)) {
				posts = data.posts as Post[];
			} else {
				loadError = data?.error || 'Could not load the feed.';
			}
		} catch {
			loadError = 'Network error — could not load the feed.';
		} finally {
			loading = false;
		}
	});

	// Prepend a freshly-created post (newest first).
	function onPosted(post: Post) {
		posts = [post, ...posts];
	}
</script>

<svelte:head>
	<title>Feed · Kazwire</title>
	<meta
		name="description"
		content="The Kazwire feed — post what's on your mind, share the games you make, and see what the community is up to."
	/>
</svelte:head>

<div class="mx-auto w-full max-w-xl">
	<!-- Sticky segmented tab bar -->
	<div class="sticky top-0 z-30 border-b border-base-300 bg-base-100/85 backdrop-blur">
		<div class="grid grid-cols-2">
			<span
				class="relative flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-base-content"
				aria-current="page"
			>
				<Icon icon="lucide:message-square-text" class="h-4 w-4" />
				Feed
				<span class="absolute inset-x-0 -bottom-px mx-auto h-1 w-14 rounded-full bg-primary"></span>
			</span>
			<a
				href="/feed/play"
				class="flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-base-content/55 transition-colors hover:text-base-content"
			>
				<Icon icon="lucide:play" class="h-4 w-4" />
				Play
			</a>
		</div>
	</div>

	<!-- Composer -->
	<PostComposer onposted={onPosted} />

	<!-- Timeline -->
	{#if loading}
		<div class="flex flex-col items-center gap-3 py-16 text-base-content/50">
			<span class="loading loading-spinner loading-md"></span>
			<span class="text-sm">Loading the feed…</span>
		</div>
	{:else if loadError}
		<div class="flex flex-col items-center gap-2 px-6 py-16 text-center text-base-content/60">
			<Icon icon="lucide:cloud-off" class="h-8 w-8 text-base-content/30" />
			<p class="text-sm">{loadError}</p>
		</div>
	{:else if posts.length === 0}
		<div class="flex flex-col items-center gap-3 px-6 py-20 text-center">
			<span class="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
				<Icon icon="lucide:sparkles" class="h-7 w-7" />
			</span>
			<p class="text-base font-bold text-base-content">Be the first to post</p>
			<p class="max-w-xs text-sm text-base-content/50">
				Say hi, share a high score, or attach a game you made. The feed starts with you.
			</p>
		</div>
	{:else}
		<div>
			{#each posts as post (post.id)}
				<PostCard {post} />
			{/each}
		</div>
		<div class="py-10 text-center text-xs text-base-content/40">You're all caught up.</div>
	{/if}
</div>
