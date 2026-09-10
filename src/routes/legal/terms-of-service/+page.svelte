<script lang="ts">
	import { page } from '$app/stores';

	const updated = 'September 10, 2026';

	const toc = [
		{ id: 'acceptance', n: 1, title: 'Accepting these terms' },
		{ id: 'no-accounts', n: 2, title: 'No accounts' },
		{ id: 'your-content', n: 3, title: 'Content you post' },
		{ id: 'kazcoins', n: 4, title: 'Kazcoins and the shop' },
		{ id: 'ai-games', n: 5, title: 'AI-created games' },
		{ id: 'mirrors', n: 6, title: 'Community domains' },
		{ id: 'third-party', n: 7, title: 'Third-party games and apps' },
		{ id: 'conduct', n: 8, title: 'What you agree not to do' },
		{ id: 'as-is', n: 9, title: 'No warranty' },
		{ id: 'liability', n: 10, title: 'Limitation of liability' },
		{ id: 'changes', n: 11, title: 'Changes to these terms' },
		{ id: 'law', n: 12, title: 'Governing law' }
	];
</script>

<svelte:head>
	<meta name="description" content="Terms of service for {$page.url.hostname}." />
</svelte:head>

<div class="kz-page">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<p class="kz-eyebrow">Legal</p>
		<h1 class="mt-2 text-4xl font-black tracking-tight text-base-content sm:text-5xl">
			Terms of Service
		</h1>
		<p class="mt-3 text-base-content/60">Last updated: {updated}</p>

		<div class="mt-5 flex flex-wrap gap-2">
			<span
				class="rounded-full border border-base-content/10 bg-base-200 px-4 py-1.5 text-sm font-bold text-base-content"
				>Terms</span
			>
			<a
				href="/legal/privacy-policy"
				class="rounded-full border border-base-content/10 px-4 py-1.5 text-sm font-bold text-base-content/60 transition hover:bg-base-200 hover:text-base-content"
				>Privacy</a
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
			<section id="acceptance" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">1.</span> Accepting these terms
				</h2>
				<p class="mt-3">
					These terms govern your use of {$page.url.hostname} — the games, community feed, rooms,
					shop, and everything else on this site. By using the site you agree to them. If you don't
					agree, don't use the site.
				</p>
			</section>

			<section id="no-accounts" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">2.</span> No accounts
				</h2>
				<p class="mt-3">
					There is no sign-up. Your browser gets a random identifier stored in localStorage, and
					that identifier is your identity here. You can pick a display name if you want one;
					nothing requires you to give a real name, email, or any other personal information.
					Clearing your browser data means starting over — we can't recover a lost identifier, and
					anything tied to it (a display name, a coin balance, posts) stays tied to it.
				</p>
			</section>

			<section id="your-content" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">3.</span> Content you post
				</h2>
				<p class="mt-3">
					Posts, comments, community notes, AI-created games, uploaded games, and shop listings are
					stored on our infrastructure and are <strong class="font-bold text-base-content"
						>publicly visible</strong
					>. Assume anyone can see anything you publish.
				</p>
				<p class="mt-3">
					You keep whatever rights you have in what you post, and you give us permission to store,
					display, and distribute it as part of running the site. Only post things you have the
					right to post.
				</p>
				<p class="mt-3">
					Content passes through automated profanity moderation on our servers, and we can remove
					any content at any time, for any reason, at our discretion — no appeals process is
					promised.
				</p>
			</section>

			<section id="kazcoins" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">4.</span> Kazcoins and the shop
				</h2>
				<p class="mt-3">
					Kazcoins, the market, and the shop are a play-money economy. Kazcoins have
					<strong class="font-bold text-base-content">no real-world value</strong>: you can't buy
					them with real money, you can't sell them, and you can't redeem or cash them out for
					anything outside the site. Buying or selling coins, items, or balances for real money is
					not allowed.
				</p>
				<p class="mt-3">
					Because it's a game, we may adjust, reset, or wipe any balance, item, or listing at any
					time — to fix bugs, undo exploits, or for any other reason — with no compensation owed.
				</p>
			</section>

			<section id="ai-games" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">5.</span> AI-created games
				</h2>
				<p class="mt-3">
					Games in the AI section are generated from user prompts by a third-party AI model. They
					are made by a machine on the spot, so there's no guarantee a generated game works, is
					fun, or does what the prompt asked. If one is broken, use the report option — reporting a
					broken game can trigger a regeneration. You're responsible for the prompts you submit;
					prompts go through the same moderation as other content.
				</p>
			</section>

			<section id="mirrors" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">6.</span> Community domains
				</h2>
				<p class="mt-3">
					Users may connect domains they own so that those domains point to this platform. If you
					connect a domain, you're responsible for it: you must actually control it, and you're
					responsible for its registration, its DNS, and anything else about how it presents the
					site. We may delist any connected domain at any time, for any reason.
				</p>
			</section>

			<section id="third-party" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">7.</span> Third-party games and apps
				</h2>
				<p class="mt-3">
					Much of the library is third-party games and apps that we embed or link to. That content
					belongs to its owners; we don't claim it as ours and we don't control it. If you own
					content that appears here and want it removed, see our
					<a href="/legal/dmca" class="font-semibold text-primary hover:underline">DMCA policy</a>.
				</p>
			</section>

			<section id="conduct" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">8.</span> What you agree not to do
				</h2>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>Don't post personal information — yours or anyone else's.</li>
					<li>Don't post anything illegal, hateful, sexually explicit, or harassing.</li>
					<li>Don't upload games or content you don't have the right to distribute.</li>
					<li>
						Don't abuse the site's systems — spamming, exploiting bugs for coins, scraping,
						evading rate limits, or interfering with other people's use of the site.
					</li>
					<li>Don't impersonate other users or site staff.</li>
				</ul>
				<p class="mt-3">
					We can restrict or block access for anyone who breaks these rules.
				</p>
			</section>

			<section id="as-is" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">9.</span> No warranty
				</h2>
				<p class="mt-3">
					The site is provided "as is" and "as available," with no warranties of any kind, express
					or implied — including fitness for a particular purpose, uptime, or accuracy. It's a free
					site; things break, games disappear, and features change.
				</p>
			</section>

			<section id="liability" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">10.</span> Limitation of liability
				</h2>
				<p class="mt-3">
					To the fullest extent the law allows, we are not liable for any damages arising from your
					use of (or inability to use) the site — including lost data, lost coin balances, removed
					content, or anything in third-party or user-generated content.
				</p>
			</section>

			<section id="changes" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">11.</span> Changes to these terms
				</h2>
				<p class="mt-3">
					We may update these terms at any time. The "Last updated" date at the top reflects the
					current version, and continuing to use the site after a change means you accept it.
				</p>
			</section>

			<section id="law" class="scroll-mt-24">
				<h2 class="text-xl font-black tracking-tight text-base-content">
					<span class="text-base-content/40">12.</span> Governing law
				</h2>
				<p class="mt-3">
					These terms are governed by the laws of the United States, without regard to conflict of
					law rules.
				</p>
				<p class="mt-3">
					Questions? Reach us through the
					<a href="/contact" class="font-semibold text-primary hover:underline">contact page</a>.
				</p>
			</section>
		</div>
	</div>
</div>
