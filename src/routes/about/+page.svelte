<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
</script>

<svelte:head>
	<title>{config.branding.name} - About</title>
	<meta property="og:title" content="{config.branding.name} - About" />
	<meta name="description" content="Master mathematics with {config.branding.name}!" />
	<meta property="og:description" content="Master mathematics with {config.branding.name}!" />
</svelte:head>

<div class="min-h-screen bg-[#5B9BFF] p-4 text-neutral md:p-12">
	<div class="mx-auto max-w-4xl overflow-hidden rounded-[3rem] bg-white shadow-2xl">
		<!-- Header -->
		<div
			class="bg-gradient-to-br from-[#0B1B33] to-[#071022] p-8 text-center text-white md:p-16"
		>
			<div
				class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white p-2 shadow-xl ring-4 ring-[#5B9BFF]/30 transition-transform hover:scale-105"
			>
				<img src="/logo.png" alt="DuckMath" class="h-full w-full rounded-2xl object-cover" />
			</div>
			<h1 class="text-5xl font-black tracking-tight text-[#5B9BFF] md:text-6xl">
				About Kazwire
			</h1>
			<p class="mx-auto mt-6 max-w-xl text-xl font-bold text-white/60">
				The premier destination for mathematical excellence.
			</p>
		</div>

		<!-- Content -->
		<div class="px-8 py-12 md:px-20 md:py-20">
			<article
				class="prose prose-lg prose-neutral max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-[#0B1B33] prose-p:font-medium prose-p:leading-relaxed prose-p:text-neutral/70"
			>
				<p class="text-xl font-bold italic text-[#0B1B33]/80">
					Mathematics is the language of the universe. At {config.branding
						.name}, we are dedicated to helping students become fluent in this language through engaged
					learning and interactive problem-solving.
				</p>

				<p>
					Founded by a team of educators and mathematicians, {config.branding.name} provides a comprehensive
					suite of tools designed to enhance numerical fluency, critical thinking, and logical reasoning.
					We believe that learning should be accessible, rigorous, and, most importantly, effective.
				</p>

				<div class="my-12 grid grid-cols-1 gap-6 md:grid-cols-2">
					<div class="rounded-3xl bg-[#5B9BFF]/10 p-8">
						<Icon icon="mdi:calculator-variant" class="mb-4 text-4xl text-[#0B1B33]" />
						<h3 class="mt-0">Core Curriculum</h3>
						<p class="mb-0">
							Aligned with standard educational requirements, our resources cover everything from basic
							arithmetic to advanced calculus concepts.
						</p>
					</div>
					<div class="rounded-3xl bg-[#5B9BFF]/10 p-8">
						<Icon icon="mdi:brain" class="mb-4 text-4xl text-[#0B1B33]" />
						<h3 class="mt-0">Cognitive Skills</h3>
						<p class="mb-0">
							Beyond numbers, we focus on developing spatial reasoning, pattern recognition, and
							strategic planning abilities.
						</p>
					</div>
				</div>

				<p>
					Our platform utilizes advanced algorithms to adapt to each student's learning pace, ensuring
					that concepts are mastered before moving on to more complex topics. Whether you are
					studying for a test or simply looking to sharpen your mind, {config.branding.name} is your
					trusted partner in education.
				</p>

				<p>
					Join the millions of learners who have improved their math scores with {config.branding
						.name}. Start your journey to mathematical mastery today.
				</p>

				<div
					class="mt-16 flex flex-col items-center border-t border-neutral/5 pt-12 text-center italic"
				>
					<p class="text-2xl font-black text-[#0B1B33]">Calculate. Solve. Succeed.</p>
					<p class="mt-2 text-lg font-bold text-neutral/40">The {config.branding.name} Educational Team</p>
				</div>
			</article>
		</div>
	</div>
</div>
