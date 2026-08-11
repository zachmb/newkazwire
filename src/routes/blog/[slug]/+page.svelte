<script lang="ts">
	import { config } from '$lib/config';
	import { blogs } from '$lib/data/blogs';
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';

	export let data;
	const { blog } = data;

	// Related blogs: Filter out current, take 3 random or next
	const relatedBlogs = blogs.filter((b) => b.slug !== blog.slug).slice(0, 3);

	let progress = 0;
	onMount(() => {
		const handleScroll = () => {
			const h = document.documentElement,
				b = document.body,
				st = 'scrollTop',
				sh = 'scrollHeight';
			progress = ((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100;
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<svelte:head>
	<meta name="description" content={blog.description} />
	<meta name="author" content={blog.author} />
</svelte:head>

<!-- Reading Progress Bar -->
<div class="fixed left-0 top-0 z-50 h-1 w-full bg-base-300">
	<div class="h-full bg-primary transition-all duration-150" style="width: {progress}%" />
</div>

<article class="min-h-screen pb-24">
	<!-- Hero Section -->
	<header class="relative flex h-[60vh] w-full items-center justify-center overflow-hidden">
		<img
			src={blog.image}
			alt={blog.title}
			class="absolute inset-0 h-full w-full object-cover brightness-50"
		/>
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-base-100" />

		<div class="relative z-10 mx-auto max-w-4xl px-4 text-center">
			<div
				in:fly={{ y: 20, duration: 800 }}
				class="mb-6 flex items-center justify-center gap-4 text-sm font-bold uppercase tracking-widest text-white/80"
			>
				<span>{blog.date}</span>
				<span class="h-2 w-2 rounded-full bg-primary" />
				<span>{blog.author}</span>
			</div>
			<h1
				in:fly={{ y: 20, duration: 800, delay: 200 }}
				class="mb-8 text-4xl font-black text-white drop-shadow-2xl md:text-6xl lg:text-7xl"
			>
				{blog.title}
			</h1>
			<div in:fade={{ duration: 1000, delay: 400 }} class="flex flex-wrap justify-center gap-3">
				{#each blog.tags as tag}
					<span class="badge badge-primary px-4 py-3">{tag}</span>
				{/each}
			</div>
		</div>
	</header>

	<!-- Content -->
	<div class="relative z-20 mx-auto -mt-32 max-w-4xl px-6">
		<div
			class="prose prose-lg max-w-none rounded-3xl border border-base-content/5 bg-base-100 p-8 shadow-2xl lg:prose-xl md:p-16"
		>
			{@html blog.content}
		</div>
	</div>

	<!-- Author & Footer Info -->
	<div class="mx-auto mt-16 max-w-4xl border-t border-base-content/10 px-6 pt-16">
		<div class="flex flex-col items-center gap-8 md:flex-row">
			<div class="flex-1 text-center md:text-left">
				<h3 class="mb-2 text-2xl font-bold">About {blog.author}</h3>
				<p class="mb-4 italic text-base-content/60">
					The Editorial Team is dedicated to exploring the intersection of browser
					performance, game mechanics, and the evolving landscape of web-based entertainment.
				</p>
				<div class="flex flex-wrap justify-center gap-4 md:justify-start">
					<a href="/blog" class="btn btn-ghost btn-sm">← Back to Blog</a>
					<button class="btn btn-primary btn-sm">Share Article</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Related Articles -->
	<section class="mx-auto mt-24 max-w-7xl px-6">
		<h2 class="mb-12 text-center text-3xl font-black md:text-left">Continue Reading</h2>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
			{#each relatedBlogs as related}
				<a href="/blog/{related.slug}" class="group block">
					<div
						class="mb-4 aspect-video overflow-hidden rounded-2xl shadow-lg transition-shadow group-hover:shadow-xl"
					>
						<img
							src={related.image}
							alt={related.title}
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
					</div>
					<h3 class="line-clamp-2 text-xl font-bold transition-colors group-hover:text-primary">
						{related.title}
					</h3>
				</a>
			{/each}
		</div>
	</section>
</article>

<style>
	/* Premium Typography and Formatting for Blog Content */
	:global(.prose h1, .prose h2, .prose h3) {
		font-weight: 900;
		margin-top: 2.5em;
		margin-bottom: 0.5em;
		background: linear-gradient(135deg, currentColor, rgba(var(--p), 1));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	:global(.prose p) {
		line-height: 1.8;
		margin-bottom: 1.5em;
		color: rgba(var(--bc), 0.85);
	}
	:global(.prose blockquote) {
		border-left: 6px solid rgb(var(--p));
		background: rgba(var(--p), 0.05);
		padding: 2rem;
		border-radius: 0 1.5rem 1.5rem 0;
		font-style: italic;
	}
	:global(.prose table) {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		border: 1px solid rgba(var(--bc), 0.1);
		border-radius: 1rem;
		overflow: hidden;
		margin: 2rem 0;
	}
	:global(.prose th) {
		background: rgba(var(--p), 0.1);
		padding: 1rem;
		font-weight: bold;
	}
	:global(.prose td) {
		padding: 1rem;
		border-top: 1px solid rgba(var(--bc), 0.1);
	}
</style>
