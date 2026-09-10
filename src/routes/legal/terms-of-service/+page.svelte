<script lang="ts">
	import { page } from '$app/stores';

	const updated = 'September 10, 2026';

	const toc = [
		{ id: 'about-us', n: 1, title: 'About us' },
		{ id: 'license', n: 2, title: 'License, access and identity' },
		{ id: 'ugc', n: 3, title: 'User generated content' },
		{ id: 'kazcoins', n: 4, title: 'Virtual currency and the shop' },
		{ id: 'ai-games', n: 5, title: 'AI-created games' },
		{ id: 'ads-third-party', n: 6, title: 'Advertisements and third-party content' },
		{ id: 'mirrors', n: 7, title: 'Community domains' },
		{ id: 'conduct', n: 8, title: 'Conduct on the service' },
		{ id: 'as-is', n: 9, title: 'No warranty' },
		{ id: 'liability', n: 10, title: 'Limitation of liability' },
		{ id: 'changes', n: 11, title: 'Changes to these terms' },
		{ id: 'law', n: 12, title: 'Governing law' }
	];
</script>

<svelte:head>
	<meta name="description" content="Terms of use for {$page.url.hostname}." />
</svelte:head>

<div class="kz-page">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<p class="kz-eyebrow">Legal</p>
		<h1 class="mt-2 text-4xl font-black tracking-tight text-base-content sm:text-5xl">
			Terms of Use
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
			<section id="about-us" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">1.</span> About us
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">1.1</strong> Welcome to
					{$page.url.hostname}. These Terms of Use apply to your use of this website's games,
					community feed, multiplayer rooms, shop, AI game creator, and any related content and
					services (collectively, the "Service"). Use of the Service is also governed by our
					<a href="/legal/privacy-policy" class="font-semibold text-primary hover:underline"
						>Privacy Policy</a
					>, which is incorporated herein by reference.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">1.2</strong> Please read these Terms of Use
					carefully before you use the Service. By using or otherwise accessing the Service you
					agree to the applicability and content of these Terms of Use as well as the Privacy
					Policy. If you do not agree to these Terms of Use, do not use the Service.
				</p>
			</section>

			<section id="license" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">2.</span> License, access and identity
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">2.1</strong> Subject to your agreement and
					continuing compliance with these Terms of Use, we grant you a non-exclusive,
					non-transferable, non-sublicensable, revocable limited license to access and use the
					Service for your own non-commercial entertainment purposes. You agree not to use the
					Service for any other purpose. The games on the Service are free to play; however, you
					are solely responsible for any costs you may incur accessing the Service through any
					internet or communication service.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">2.2</strong> There is no sign-up and there
					are no accounts. Your browser receives a random identifier stored in localStorage, and
					that identifier is your identity on the Service. You may pick a display name if you
					want one; nothing requires you to give a real name, email address, or any other
					personal information. Clearing your browser data means starting over — we cannot
					recover a lost identifier, and anything tied to it (a display name, a coin balance,
					posts) stays tied to it.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">2.3</strong> Without limiting any other
					remedies, we may limit, suspend, terminate, or block access to the Service or portions
					thereof if you are, or we suspect that you are, failing to comply with these Terms of
					Use, or for any actual or suspected illegal or improper use of the Service, without
					notice to you. We are under no obligation to compensate you for any losses related to
					this, including any coins, items, or content associated with your use of the Service.
				</p>
			</section>

			<section id="ugc" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">3.</span> User generated content
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.1</strong> The Service contains content
					from players ("User Generated Content"), such as posts, comments, community notes,
					AI-created games, uploaded games, and shop listings. All User Generated Content is
					<strong class="font-bold text-base-content">publicly visible</strong> — assume anyone
					can see anything you publish. We are not actively involved in the creation of User
					Generated Content and do not endorse it, nor do we warrant that such content does not
					infringe any third-party rights or is not otherwise unlawful. By using the Service, you
					may be exposed to User Generated Content that is not in line with your expectations,
					and you bear the risks associated with that. We are not responsible or liable for any
					User Generated Content.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.2</strong> If you submit any User
					Generated Content yourself, you grant us a non-exclusive, perpetual, transferable,
					fully paid-up, royalty-free, worldwide license to use, publish, store, reproduce,
					display, adapt, and distribute such content, or any portion thereof, as part of
					operating and promoting the Service.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.3</strong> Without prejudice to 3.2, you
					retain whatever rights you have in your User Generated Content. We reserve the right,
					but have no obligation, to monitor User Generated Content, and we may edit, refuse to
					post, or remove any User Generated Content at our own discretion, for any reason
					whatsoever, at any time. Content passes through automated moderation on our servers; no
					appeals process is promised.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.4</strong> If you submit any User
					Generated Content to the Service, you warrant that you are authorized to do so and to
					grant the license referred to in 3.2, and that such content does not infringe any
					third-party rights, including intellectual property rights, and does not violate any
					applicable law.
				</p>
			</section>

			<section id="kazcoins" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">4.</span> Virtual currency and the shop
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">4.1</strong> Kazcoins, the market, and the
					shop are a play-money economy. Kazcoins have
					<strong class="font-bold text-base-content">no real-world value</strong>: you cannot
					buy them with real money, you cannot sell them, and you cannot redeem or cash them out
					for anything outside the Service. Buying or selling coins, items, or balances for real
					money is not allowed.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">4.2</strong> Because it is a game, we may
					adjust, reset, or wipe any balance, item, or listing at any time — to fix bugs, undo
					exploits, or for any other reason — with no compensation owed.
				</p>
			</section>

			<section id="ai-games" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">5.</span> AI-created games
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">5.1</strong> Games in the AI section are
					generated from user prompts by a third-party AI model. They are made by a machine on
					the spot, so there is no guarantee a generated game works, is fun, or does what the
					prompt asked. If one is broken, use the report option — reporting a broken game can
					trigger a regeneration.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">5.2</strong> You are responsible for the
					prompts you submit; prompts are User Generated Content and go through the same
					moderation as other content.
				</p>
			</section>

			<section id="ads-third-party" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">6.</span> Advertisements and third-party content
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">6.1</strong> When providing the Service we
					may display advertising before, in, after, or around games and pages. Any dealings you
					engage in with any advertisers via the Service are between you and the advertiser, and
					subject to that advertiser's own terms and conditions (if any). We are not liable for
					any loss or claim you may have against any advertiser.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">6.2</strong> Much of the library consists
					of third-party games and apps that we embed or link to, including links provided in the
					apps section. That content belongs to its owners; we do not claim it as ours, we do not
					control it, and the existence of a link or embed does not mean we endorse the
					third-party site or service. You acknowledge and agree that we are not responsible or
					liable for any content or materials on third-party sites. If you own content that
					appears on the Service and want it removed, see our
					<a href="/legal/dmca" class="font-semibold text-primary hover:underline">DMCA policy</a
					>.
				</p>
			</section>

			<section id="mirrors" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">7.</span> Community domains
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">7.1</strong> Users may connect domains they
					own so that those domains point to this platform. If you connect a domain, you are
					responsible for it: you must actually control it, and you are responsible for its
					registration, its DNS, and anything else about how it presents the Service. We may
					delist any connected domain at any time, for any reason.
				</p>
			</section>

			<section id="conduct" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">8.</span> Conduct on the service
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">8.1</strong> You may use the Service only
					for lawful, personal, non-commercial purposes. To the extent any content is available
					for downloading, it may only be downloaded for personal use and may not be further
					reproduced or distributed.
				</p>
				<p class="mt-3"><strong class="font-bold text-base-content">8.2</strong> You may not:</p>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>
						engage in any act that we deem to be in conflict with the spirit or intent of the
						Service;
					</li>
					<li>
						use cheats, exploits, automation software, bots, hacks, or any unauthorized
						third-party software designed to modify or interfere with the Service — including
						exploiting bugs for coins;
					</li>
					<li>
						use the Service for any data mining, scraping, or similar data-gathering and
						extraction tools;
					</li>
					<li>
						offer any form of advertising or promotion on the Service without our prior written
						consent;
					</li>
					<li>
						transmit, directly or indirectly, any unsolicited bulk communications or spam through
						the Service;
					</li>
					<li>
						use the Service in a manner that could damage, disable, or overburden our servers or
						networks, or evade rate limits;
					</li>
					<li>interfere with any other person's use and enjoyment of the Service; or</li>
					<li>
						circumvent any mechanisms included in the Service for moderation or for preventing
						the unauthorized use of the Service.
					</li>
				</ul>
				<p class="mt-3">
					<strong class="font-bold text-base-content">8.3</strong> You may not submit or transmit
					through the Service any information, content, or material, or otherwise engage in any
					conduct, that:
				</p>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>
						violates or infringes the rights of others, including patent, trademark, trade
						secret, copyright, publicity, or other proprietary rights;
					</li>
					<li>
						is unlawful, threatening, abusive, harassing, defamatory, deceptive, fraudulent,
						invasive of another's privacy, or sexually explicit;
					</li>
					<li>
						victimizes, harasses, degrades, or intimidates an individual or group of individuals
						on the basis of religion, gender, sexual orientation, race, ethnicity, age, or
						disability;
					</li>
					<li>
						contains personal information — yours or anyone else's, including real names,
						schools, or locations;
					</li>
					<li>impersonates any person, business, or entity, including other users or site staff;</li>
					<li>
						contains viruses or any other computer code, files, or programs that interrupt,
						destroy, or limit the functionality of any software, hardware, or the Service; or
					</li>
					<li>
						encourages conduct that would constitute a criminal offense or give rise to civil
						liability, or otherwise violates these Terms of Use.
					</li>
				</ul>
				<p class="mt-3">
					<strong class="font-bold text-base-content">8.4</strong> We reserve the right to
					determine what conduct we consider to be in violation of these Terms of Use or
					otherwise outside their intent or spirit, and to take action as a result — which may
					include removing content and prohibiting you from using the Service in whole or in
					part.
				</p>
			</section>

			<section id="as-is" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">9.</span> No warranty
				</h2>
				<p class="mt-3">
					The Service is provided "as is" and "as available," with no warranties of any kind,
					express or implied — including fitness for a particular purpose, uptime, or accuracy.
					It is a free service; things break, games disappear, and features change.
				</p>
			</section>

			<section id="liability" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">10.</span> Limitation of liability
				</h2>
				<p class="mt-3">
					To the fullest extent the law allows, we are not liable for any damages arising from
					your use of (or inability to use) the Service — including lost data, lost coin
					balances, removed content, or anything in third-party or User Generated Content.
				</p>
			</section>

			<section id="changes" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">11.</span> Changes to these terms
				</h2>
				<p class="mt-3">
					We may update these Terms of Use at any time. The "Last updated" date at the top
					reflects the current version, and continuing to use the Service after a change means
					you accept it.
				</p>
			</section>

			<section id="law" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">12.</span> Governing law
				</h2>
				<p class="mt-3">
					These Terms of Use are governed by the laws of the United States, without regard to
					conflict of law rules.
				</p>
				<p class="mt-3">
					Questions? Reach us through the
					<a href="/contact" class="font-semibold text-primary hover:underline">contact page</a>.
				</p>
			</section>
		</div>
	</div>
</div>
