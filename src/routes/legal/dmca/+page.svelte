<script lang="ts">
	import { page } from '$app/stores';

	const updated = 'September 10, 2026';

	const toc = [
		{ id: 'overview', n: 1, title: 'Overview' },
		{ id: 'notice', n: 2, title: 'What a takedown notice must include' },
		{ id: 'send', n: 3, title: 'Where to send it' },
		{ id: 'response', n: 4, title: 'What happens next' },
		{ id: 'misuse', n: 5, title: 'False claims' }
	];
</script>

<svelte:head>
	<meta name="description" content="DMCA takedown policy for {$page.url.hostname}." />
</svelte:head>

<div class="kz-page">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<p class="kz-eyebrow">Legal</p>
		<h1 class="mt-2 text-4xl font-black tracking-tight text-base-content sm:text-5xl">
			DMCA Policy
		</h1>
		<p class="mt-3 text-base-content/60">Last updated: {updated}</p>

		<div class="mt-5 flex flex-wrap gap-2">
			<a
				href="/legal/terms-of-service"
				class="rounded-full border border-base-content/10 px-4 py-1.5 text-sm font-bold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
				>Terms</a
			>
			<a
				href="/legal/privacy-policy"
				class="rounded-full border border-base-content/10 px-4 py-1.5 text-sm font-bold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
				>Privacy</a
			>
			<span
				class="rounded-full border border-base-content/10 bg-base-200 px-4 py-1.5 text-sm font-bold text-base-content"
				>DMCA</span
			>
		</div>

		<!-- Table of contents -->
		<nav class="kz-card mt-8 p-6">
			<p class="kz-eyebrow mb-3">On this page</p>
			<ol class="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
				{#each toc as item}
					<li>
						<a
							href="#{item.id}"
							class="text-sm font-semibold text-base-content/60 transition hover:text-primary"
						>
							<span class="text-base-content/40">{item.n}.</span>
							{item.title}
						</a>
					</li>
				{/each}
			</ol>
		</nav>

		<!-- Sections -->
		<div class="mt-12 space-y-12 leading-relaxed text-base-content/60">
			<section id="overview" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">1.</span> Overview
				</h2>
				<p class="mt-3">
					{$page.url.hostname} hosts and links to games, apps, and user-submitted content. The
					third-party games and apps in the library belong to their owners — we don't claim them as
					ours. We respect copyright, and under the Digital Millennium Copyright Act (DMCA) we
					respond to valid takedown notices from copyright owners or their authorized agents.
				</p>
				<p class="mt-3">
					If you own content that appears on this site and want it removed, send us a notice as
					described below.
				</p>
			</section>

			<section id="notice" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">2.</span> What a takedown notice must include
				</h2>
				<p class="mt-3">For us to act on it, your notice needs all of the following:</p>
				<ol class="mt-3 list-decimal space-y-2 pl-5">
					<li>Identification of the copyrighted work you claim is infringed.</li>
					<li>
						Identification of the material you claim is infringing — a URL on this site is the
						fastest way for us to find it.
					</li>
					<li>Your contact information: name, address, phone number, and email.</li>
					<li>
						A statement that you have a good-faith belief the use isn't authorized by the copyright
						owner, its agent, or the law.
					</li>
					<li>
						A statement, under penalty of perjury, that the information in your notice is accurate
						and that you are the copyright owner or authorized to act for them.
					</li>
					<li>Your physical or electronic signature.</li>
				</ol>
			</section>

			<section id="send" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">3.</span> Where to send it
				</h2>
				<p class="mt-3">Email your notice to:</p>
				<div class="kz-card mt-3 p-5">
					<p class="kz-eyebrow">DMCA notices</p>
					<p class="mt-1 font-mono text-lg font-bold text-base-content">
						dmca@{$page.url.hostname}
					</p>
				</div>
				<p class="mt-3">
					If email doesn't work for you, you can also reach us through the
					<a href="/contact" class="font-semibold text-primary hover:underline">contact page</a> —
					include everything from section 2 either way.
				</p>
			</section>

			<section id="response" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">4.</span> What happens next
				</h2>
				<p class="mt-3">
					We review complete notices promptly and remove or disable access to material we determine
					is infringing. Incomplete notices may be ignored — the list in section 2 is what makes a
					notice actionable. Where user-submitted content is involved, we may also restrict repeat
					infringers' access to the site.
				</p>
			</section>

			<section id="misuse" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">5.</span> False claims
				</h2>
				<p class="mt-3">
					Under the DMCA, knowingly misrepresenting that material is infringing can make you liable
					for damages. Only send a notice for content you actually own or are authorized to act on.
				</p>
			</section>
		</div>
	</div>
</div>
