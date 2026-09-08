<script lang="ts">
	import Cloak from '$lib/components/Cloak.svelte';

	// A single horizontal rail exactly as the original kazwire.com home: a bold
	// capitalized heading with a blue "View more" accent pill, followed by a
	// horizontally-scrolling row of landscape cards (image darkened, title +
	// optional subtitle bottom-left).
	export let title: string;
	export let viewMoreHref: string | null = null;
	export let items: { title: string; subtitle?: string; image: string; href: string }[] = [];
	/** Cloak the card/heading text (keyword-scanner resistant) like the rest of the app. */
	export let cloak = false;
</script>

{#if items.length}
	<div class="max-w-[calc(100vw-2rem)]">
		<h2 class="mb-1 flex items-center text-2xl font-bold capitalize">
			{#if cloak}<Cloak text={title} />{:else}{title}{/if}
			{#if viewMoreHref}
				<a
					href={viewMoreHref}
					class="my-auto ml-2 rounded-full bg-accent px-2 py-1 text-sm text-accent-content transition-colors hover:bg-accent-focus"
				>
					View more
				</a>
			{/if}
		</h2>
		<div class="relative">
			<div class="no-scrollbar flex flex-row justify-start gap-x-4 overflow-x-auto scroll-smooth pb-5">
				{#each items as item (item.href)}
					<a
						class="block h-40 w-[18rem] flex-none text-left transition-all duration-150 hover:-translate-y-0.5 hover:cursor-pointer hover:shadow-md"
						href={item.href}
						title={item.title}
					>
						<div class="relative h-full w-full overflow-hidden rounded-box border border-base-content/10 bg-black">
							<img
								class="absolute h-full w-full bg-white object-cover"
								loading="lazy"
								src={item.image}
								alt={item.title}
							/>
							<div class="absolute inset-0 bg-black/40"></div>
							<div class="absolute inset-0 flex flex-col justify-end gap-0.5 p-3">
								<h3 class="text-lg font-bold leading-tight tracking-tight text-white">
									{#if cloak}<Cloak text={item.title} />{:else}{item.title}{/if}
								</h3>
								{#if item.subtitle}
									<p class="line-clamp-1 text-sm text-white/80">{item.subtitle}</p>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</div>
{/if}
