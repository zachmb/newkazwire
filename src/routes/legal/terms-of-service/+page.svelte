<script lang="ts">
	import { config } from '$lib/config';
</script>

<svelte:head>
	<title>{config.branding.name} - Terms of Service</title>
	<meta property="og:title" content="{config.branding.name} - Terms of Service" />
	<meta name="description" content="Play and browse for free now on {config.branding.name}!" />
	<meta
		property="og:description"
		content="Play and browse for free now on {config.branding.name}!"
	/>
</svelte:head>

<div class="min-h-screen bg-base-200 p-4 text-base-content md:p-12">
	<div class="mx-auto max-w-4xl overflow-hidden rounded-[3rem] bg-base-100 shadow-2xl">
		<!-- Header -->
		<div class="bg-gradient-to-br from-[#0B1B33] to-[#071022] p-8 text-center text-white md:p-16">
			<div
				class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-base-100 p-2 shadow-xl ring-4 ring-[#5B9BFF]/30 transition-transform hover:scale-105"
			>
				<img src="/logo.png" alt="Kazwire" class="h-full w-full rounded-2xl object-cover" />
			</div>
			<h1 class="text-5xl font-black tracking-tight text-[#5B9BFF] md:text-6xl">
				Terms of Service
			</h1>
			<p class="mx-auto mt-6 max-w-xl text-xl font-bold text-white/60">
				The rules of the lily pad.
			</p>
		</div>

		<!-- Content -->
		<div class="px-8 py-12 md:px-20 md:py-20">
			<article
				class="prose prose-lg prose-neutral max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-base-content prose-p:font-medium prose-p:leading-relaxed prose-p:text-base-content/70 prose-li:font-medium prose-li:text-base-content/70"
			>
				<p>
					By accessing {config.branding.name}, you are agreeing to be bound by these website Terms
					and Conditions of Use, all applicable laws and regulations, and agree that you are
					responsible for compliance with any applicable local laws.
				</p>

				<h2>Use License</h2>
				<p>
					Permission is granted to temporarily download one copy of the materials (information or
					software) on {config.branding.name}'s website for personal, non-commercial transitory
					viewing only. This is the grant of a license, not a transfer of title.
				</p>

				<h2>Disclaimer</h2>
				<p>
					The materials on {config.branding.name}'s website are provided "as is". {config.branding
						.name} makes no warranties, expressed or implied, and hereby disclaims and negates all other
					warranties.
				</p>

				<h2>Limitations</h2>
				<p>
					In no event shall {config.branding.name} or its suppliers be liable for any damages arising
					out of the use or inability to use the materials on {config.branding.name}'s website.
				</p>

				<h2>Revisions and Errata</h2>
				<p>
					The materials appearing on {config.branding.name}'s website could include technical,
					typographical, or photographic errors. {config.branding.name} does not warrant that any of
					the materials on its website are accurate, complete, or current.
				</p>

				<h2>Governing Law</h2>
				<p>
					Any claim relating to {config.branding.name}'s website shall be governed by the laws of
					the site owner's jurisdiction without regard to its conflict of law provisions.
				</p>
			</article>
		</div>
	</div>
</div>
