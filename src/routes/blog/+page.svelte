<script lang="ts">
	import { blogs } from '$lib/data/blogs';
	import { config } from '$lib/config';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let searchQuery = '';
	let selectedTag = 'All';

	$: filteredBlogs = blogs.filter((blog) => {
		const matchesSearch =
			blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			blog.description.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesTag = selectedTag === 'All' || blog.tags.includes(selectedTag);
		return matchesSearch && matchesTag;
	});

	const allTags = ['All', ...new Set(blogs.flatMap((b) => b.tags))];

	let mounted = false;
	onMount(() => {
		mounted = true;
	});
</script>

<svelte:head>
	<meta
		name="description"
		content="Explore the latest in gaming, technology, and AI with the blog. Deep dives, industry trends, and more."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-base-100 to-base-200 px-4 py-12 md:px-8 lg:px-16">
	<!-- Header -->
	<div class="mx-auto mb-16 max-w-7xl text-center">
		{#if mounted}
			<h1
				in:fly={{ y: -20, duration: 800 }}
				class="mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-5xl font-black text-transparent md:text-7xl"
			>
				Insights & Innovation
			</h1>
			<p
				in:fly={{ y: 20, duration: 800, delay: 200 }}
				class="mx-auto max-w-2xl text-xl text-base-content/70"
			>
				Deep dives into the future of gaming, the evolution of the web, and how the web is
				redefining the entertainment landscape.
			</p>
		{/if}
	</div>

	<!-- Controls -->
	<div class="mx-auto mb-12 flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
		<div class="flex flex-wrap justify-center gap-2">
			{#each allTags as tag}
				<button
					on:click={() => (selectedTag = tag)}
					class="btn btn-sm rounded-full transition-all {selectedTag === tag
						? 'btn-primary'
						: 'btn-ghost bg-base-300/50'}"
				>
					{tag}
				</button>
			{/each}
		</div>
		<div class="relative w-full md:w-80">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search articles..."
				class="input input-bordered w-full rounded-full bg-base-100/50 backdrop-blur-sm"
			/>
			<span class="absolute right-4 top-3 italic text-base-content/30">Search</span>
		</div>
	</div>

	<!-- Grid -->
	<div class="mx-auto grid max-w-7xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
		{#each filteredBlogs as blog, i}
			<a
				href="/blog/{blog.slug}"
				class="group card overflow-hidden border border-base-content/5 bg-base-100 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
				in:fade={{ duration: 400, delay: i * 100 }}
			>
				<figure class="relative h-48 overflow-hidden">
					<img
						src={blog.image}
						alt={blog.title}
						class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
					/>
					<div
						class="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					>
						<span class="font-bold text-white">Read More →</span>
					</div>
				</figure>
				<div class="card-body p-6">
					<div
						class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"
					>
						{blog.date} • {blog.author}
					</div>
					<h2 class="card-title mb-3 text-2xl font-bold transition-colors group-hover:text-primary">
						{blog.title}
					</h2>
					<p class="mb-6 line-clamp-3 text-base-content/70">
						{blog.description}
					</p>
					<div class="flex flex-wrap gap-2">
						{#each blog.tags as tag}
							<span class="badge badge-outline badge-sm">{tag}</span>
						{/each}
					</div>
				</div>
			</a>
		{/each}
	</div>

	{#if filteredBlogs.length === 0}
		<div class="py-24 text-center italic opacity-50">No articles found matching your search...</div>
	{/if}
</div>

<style>
	.card {
		background: rgba(var(--b1), 0.7);
		backdrop-filter: blur(10px);
	}
</style>
