<script lang="ts">
	import { page } from '$app/stores';

	const updated = 'September 10, 2026';

	const toc = [
		{ id: 'short-version', n: 1, title: 'The short version' },
		{ id: 'what-we-collect', n: 2, title: 'What we collect' },
		{ id: 'what-we-dont', n: 3, title: "What we don't collect" },
		{ id: 'how-we-use', n: 4, title: 'How we use it' },
		{ id: 'public-content', n: 5, title: 'What other people can see' },
		{ id: 'storage', n: 6, title: 'Cookies and local storage' },
		{ id: 'third-party', n: 7, title: 'Third-party games and apps' },
		{ id: 'minors', n: 8, title: 'Kids and personal information' },
		{ id: 'retention', n: 9, title: 'Retention and removal' },
		{ id: 'changes', n: 10, title: 'Changes to this policy' }
	];
</script>

<svelte:head>
	<meta name="description" content="Privacy policy for {$page.url.hostname}." />
</svelte:head>

<div class="kz-page">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<p class="kz-eyebrow">Legal</p>
		<h1 class="mt-2 text-4xl font-black tracking-tight text-base-content sm:text-5xl">
			Privacy Policy
		</h1>
		<p class="mt-3 text-base-content/60">Last updated: {updated}</p>

		<div class="mt-5 flex flex-wrap gap-2">
			<a
				href="/legal/terms-of-service"
				class="rounded-full border border-base-content/10 px-4 py-1.5 text-sm font-bold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
				>Terms</a
			>
			<span
				class="rounded-full border border-base-content/10 bg-base-200 px-4 py-1.5 text-sm font-bold text-base-content"
				>Privacy</span
			>
			<a
				href="/legal/dmca"
				class="rounded-full border border-base-content/10 px-4 py-1.5 text-sm font-bold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
				>DMCA</a
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
			<section id="short-version" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">1.</span> The short version
				</h2>
				<p class="mt-3">
					{$page.url.hostname} has no accounts and never asks who you are. Your browser gets a
					random identifier, we keep coarse usage stats tied to that identifier, and anything you
					choose to post is public. That's most of it — the rest of this page is the detail.
				</p>
			</section>

			<section id="what-we-collect" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">2.</span> What we collect
				</h2>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>
						<strong class="font-bold text-base-content">A random session identifier.</strong>
						Generated in your browser and stored in localStorage. It identifies your browser, not
						you.
					</li>
					<li>
						<strong class="font-bold text-base-content">A display name, if you set one.</strong>
						Optional and self-chosen — pick anything (please don't use your real name).
					</li>
					<li>
						<strong class="font-bold text-base-content">Content you post.</strong> Posts, comments,
						community notes, AI game prompts, uploaded games, and shop listings, stored on our
						infrastructure.
					</li>
					<li>
						<strong class="font-bold text-base-content">Coarse usage events.</strong> Things like
						page views and games played, tied to the anonymous session identifier — enough to see
						what's popular, not to profile a person.
					</li>
					<li>
						<strong class="font-bold text-base-content">IP addresses, server-side only.</strong>
						Used for rate limiting and abuse prevention. They are never displayed publicly and
						aren't attached to your public activity.
					</li>
				</ul>
			</section>

			<section id="what-we-dont" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">3.</span> What we don't collect
				</h2>
				<p class="mt-3">
					No email address, no real name, no phone number, no password, no payment details. There
					is no registration form anywhere on the site, and nothing on the site requires personal
					information to use.
				</p>
			</section>

			<section id="how-we-use" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">4.</span> How we use it
				</h2>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>Running the site: showing your posts, keeping your coin balance, saving settings.</li>
					<li>Rate limiting and abuse prevention (this is what IP addresses are for).</li>
					<li>Understanding usage in aggregate — which games and features people actually use.</li>
				</ul>
				<p class="mt-3">We don't sell this data or use it for ad targeting.</p>
			</section>

			<section id="public-content" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">5.</span> What other people can see
				</h2>
				<p class="mt-3">
					Everything you publish — posts, comments, community notes, AI-created games, uploaded
					games, shop listings, and your display name — is publicly visible to anyone on the site.
					Don't put personal information in any of it. Content goes through automated profanity
					moderation, and we may remove content at our discretion.
				</p>
			</section>

			<section id="storage" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">6.</span> Cookies and local storage
				</h2>
				<p class="mt-3">
					The site keeps its data in your browser's localStorage: your session identifier, your
					settings, and similar site state. There's no third-party advertising or tracking cookie
					layer. Clearing your browser data removes all of it — along with the identity your
					posts and balance are tied to.
				</p>
			</section>

			<section id="third-party" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">7.</span> Third-party games and apps
				</h2>
				<p class="mt-3">
					Many games and apps in the library are embedded from or link to third parties, and
					AI-created games are generated by a third-party AI model from user prompts. When you
					interact with third-party content, that third party's own practices apply — we don't
					control what embedded content does.
				</p>
			</section>

			<section id="minors" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">8.</span> Kids and personal information
				</h2>
				<p class="mt-3">
					The site is designed to be usable without providing any personal information, and we
					don't knowingly collect personal information from anyone, including children. If you're
					a minor, use a made-up display name and never post your real name, school, location, or
					anything else identifying — that rule is in our
					<a href="/legal/terms-of-service" class="font-semibold text-primary hover:underline"
						>terms</a
					>
					for everyone.
				</p>
			</section>

			<section id="retention" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">9.</span> Retention and removal
				</h2>
				<p class="mt-3">
					Public content stays up until it's removed — by moderation or at our discretion. Usage
					events are kept in coarse, aggregate-oriented form. If something on the site exposes your
					personal information and you want it taken down, reach us through the
					<a href="/contact" class="font-semibold text-primary hover:underline">contact page</a>
					and we'll look at it.
				</p>
			</section>

			<section id="changes" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">10.</span> Changes to this policy
				</h2>
				<p class="mt-3">
					If this policy changes, the "Last updated" date at the top changes with it. Continuing to
					use the site after an update means you accept the new version.
				</p>
			</section>
		</div>
	</div>
</div>
