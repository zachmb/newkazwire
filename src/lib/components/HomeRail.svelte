<script lang="ts">
	import Cloak from '$lib/components/Cloak.svelte';
	import Icon from '@iconify/svelte';

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
			<!-- -mx-1 px-1 + py padding gives the hover ring clearance: overflow-x-auto
			     forces overflow-y to compute to auto (CSS spec), which would otherwise
			     clip the 2px ring at the top/bottom and the scroll edges. The negative
			     margin cancels the horizontal padding so cards still align with the heading. -->
			<div class="no-scrollbar -mx-1 flex flex-row justify-start gap-x-4 overflow-x-auto scroll-smooth px-1 pb-6 pt-2">
				{#each items as item (item.href)}
					<a
						class="group block h-40 w-[18rem] flex-none text-left transition-all duration-150 hover:-translate-y-0.5 hover:cursor-pointer"
						href={item.href}
						title={item.title}
					>
						<!-- Same treatment as the All-Games GameCard tiles: 1px ring that turns
						     primary (orange/clay) on hover, image zoom, and a centered play
						     affordance that fades in. -->
						<div
							class="relative h-full w-full overflow-hidden rounded-box bg-black ring-1 ring-black/10 transition-all duration-200 group-hover:ring-2 group-hover:ring-primary group-hover:shadow-md"
						>
							<img
								class="absolute h-full w-full bg-white object-cover transition-transform duration-500 group-hover:scale-105"
								loading="lazy"
								src={item.image}
								alt={item.title}
							/>
							<div class="absolute inset-0 bg-black/40 transition-colors duration-200 group-hover:bg-black/25"></div>

							<!-- Play affordance -->
							<div class="pointer-events-none absolute inset-0 grid place-items-center">
								<div
									class="grid h-14 w-14 translate-y-1 place-items-center rounded-full bg-primary text-white opacity-0 shadow-sm ring-2 ring-white/30 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
								>
									<Icon icon="mdi:play" class="text-3xl" />
								</div>
							</div>

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
