<script lang="ts">
	import { page } from '$app/stores';

	const updated = 'September 10, 2026';

	const toc = [
		{ id: 'about-website', n: 1, title: 'About our website' },
		{ id: 'information-we-collect', n: 2, title: 'The information we collect' },
		{ id: 'cookies', n: 3, title: 'Cookies, local storage and IP addresses' },
		{ id: 'advertising', n: 4, title: 'Advertising partners' },
		{ id: 'who-we-share-with', n: 5, title: 'To whom do we provide this information' },
		{ id: 'why-we-collect', n: 6, title: 'Why do we collect information' },
		{ id: 'public-content', n: 7, title: 'Publicly visible content' },
		{ id: 'minors', n: 8, title: "Children's personal information" },
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

		<!-- Intro -->
		<div class="mt-8 space-y-3 leading-relaxed text-base-content/60">
			<p>
				{$page.url.hostname} is dedicated to protecting the privacy of our users and handling any
				data we obtain with care and respect. An overall principle is that we do not collect more
				information than is reasonably necessary to provide you with the best user experience —
				and this site is built so that it can be used without providing any personal information
				at all.
			</p>
			<p>
				This privacy policy (the "Privacy Policy") applies to your use of this website, all of the
				web pages that are part of it, and the games, community features, and other activities
				offered on or through it (collectively, the "Website"). By using or accessing the Website,
				you are accepting the practices described in this Privacy Policy.
			</p>
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
			<section id="about-website" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">1.</span> About our website
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">1.1</strong> The Website offers a diverse
					and exciting mix of online games — titles curated by us as well as games created by the
					community using the Website's built-in AI game creator. Players can access the Website
					and play games without registering: there are no accounts, no sign-up forms, and no
					passwords anywhere on the Website. Visitors can also browse the library, join
					multiplayer rooms, post to the community feed, and rate and comment on games.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">1.2</strong> Certain games and apps on the
					Website are controlled by third parties. We use commercially reasonable efforts to
					ensure that data processing on the Website is in line with applicable data protection
					laws, but as we do not control third-party games, data may be collected by them of
					which we are not aware. If you have concerns about data processing in a specific game,
					please reach us through the
					<a href="/contact" class="font-semibold text-primary hover:underline">contact page</a>.
				</p>
			</section>

			<section id="information-we-collect" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">2.</span> The information we collect
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">2.1</strong> We collect certain information
					when you use or access the Website. This information relates to how you use the Website,
					and may include (among others) the following:
				</p>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>
						<strong class="font-bold text-base-content">A random session identifier</strong> —
						generated in your browser and stored in localStorage. It identifies your browser, not
						you.
					</li>
					<li>
						<strong class="font-bold text-base-content">A display name, if you set one</strong> —
						optional and self-chosen (please don't use your real name).
					</li>
					<li>
						<strong class="font-bold text-base-content">Content you submit</strong> — posts,
						comments, community notes, game ratings, AI game prompts, uploaded games, and shop
						listings, stored on our infrastructure.
					</li>
					<li>
						<strong class="font-bold text-base-content">Usage information</strong> — page views,
						games played, and similar coarse events tied to the anonymous session identifier,
						along with browser type and user agent, referral source, and information about the
						timing and pattern of your use of the Website.
					</li>
					<li>
						<strong class="font-bold text-base-content">Your IP address</strong> — collected
						server-side only, for rate limiting, abuse prevention, and debugging.
					</li>
					<li>
						<strong class="font-bold text-base-content">
							Information collected through cookies or similar technologies
						</strong>
						— see sections 3 and 4 below.
					</li>
				</ul>
				<p class="mt-3">
					<strong class="font-bold text-base-content">2.2</strong> We do
					<strong class="font-bold text-base-content">not</strong> collect your email address,
					real name, phone number, password, or payment details. There is no registration form
					anywhere on the Website, and nothing on the Website requires personal information to
					use.
				</p>
			</section>

			<section id="cookies" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">3.</span> Cookies, local storage and IP addresses
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.1</strong> When you visit the Website, our
					servers automatically see your computer's IP address. IP addresses are used for the
					purpose of rate limiting, abuse prevention, security, and debugging, and for improving
					the Website. They are never displayed publicly and are not attached to your public
					activity.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.2</strong> The Website stores certain
					information in your browser using localStorage and similar technologies: your session
					identifier, your settings, and similar site state. This is used to operate the Website
					and its features, to remember your preferences, and to keep your coin balance and
					activity tied to your browser. Clearing your browser data removes all of it — along
					with the identity your posts and balance are tied to.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">3.3</strong> If you do not want cookies
					stored on your computer, you can prevent this by changing your browser settings to "do
					not accept cookies." Your browser manufacturer can provide more details on how this
					works. However, some parts of the Website may not function as intended without them.
				</p>
			</section>

			<section id="advertising" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">4.</span> Advertising partners
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">4.1</strong> The Website uses third-party
					advertising partners, including Google, to help present advertisements on the Website.
					These advertising partners may use cookies, web beacons, or similar technologies for
					presenting, targeting, and measuring the effectiveness of their advertisements, using
					data gathered over time and across their networks of web pages.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">4.2</strong> Third-party vendors, including
					Google, use cookies to serve ads based on a user's prior visits to this website or other
					websites. Google's use of advertising cookies enables it and its partners to serve ads
					to users based on their visits to this site and/or other sites on the Internet. Users
					may opt out of personalized advertising by visiting
					<a
						href="https://www.google.com/settings/ads"
						target="_blank"
						rel="noopener noreferrer"
						class="font-semibold text-primary hover:underline">Google Ads Settings</a
					>
					or
					<a
						href="https://www.aboutads.info"
						target="_blank"
						rel="noopener noreferrer"
						class="font-semibold text-primary hover:underline">www.aboutads.info</a
					>.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">4.3</strong> The use of cookies, web
					beacons, or similar technologies by these third parties is subject to their own privacy
					policies, not this Privacy Policy. Our advertising partners are responsible for their
					own compliance with applicable data protection legislation.
				</p>
			</section>

			<section id="who-we-share-with" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">5.</span> To whom do we provide this information
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">5.1</strong> We may provide information to
					parties whose services we engage for the purposes of our normal operations — for
					example, providers of hosting and storage infrastructure for the Website, the
					third-party AI model provider that generates community games from user prompts, and the
					advertising partners described in section 4. We may also supply information to other
					parties if we are required to do so by law or by a ruling handed down by a court of
					law.
				</p>
				<p class="mt-3">
					<strong class="font-bold text-base-content">5.2</strong> We do not sell personal
					details to other parties for commercial, advertising, or marketing purposes.
				</p>
			</section>

			<section id="why-we-collect" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">6.</span> Why do we collect information
				</h2>
				<p class="mt-3">
					<strong class="font-bold text-base-content">6.1</strong> We use the information we have
					to maintain the general and personalized content and functionality of the Website. We
					may (among others) use the information that we have:
				</p>
				<ul class="mt-3 list-disc space-y-2 pl-5">
					<li>To provide you access to the Website and its games, features, and services, and to continuously improve them;</li>
					<li>To store your Website settings, gaming activity, and coin balance, and to show your posts and profile;</li>
					<li>To analyze and optimize the functioning of the Website and games in aggregate — which games and features people actually use;</li>
					<li>To present advertisements on the Website;</li>
					<li>To prevent cheating, spam, abuse, fraud, and crime;</li>
					<li>To meet legal obligations.</li>
				</ul>
			</section>

			<section id="public-content" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">7.</span> Publicly visible content
				</h2>
				<p class="mt-3">
					Everything you publish on the Website — posts, comments, community notes, AI-created
					games, uploaded games, shop listings, and your display name — is publicly visible to
					anyone on the Website. Do not put personal information in any of it. Content goes
					through automated moderation, and we may remove content at our discretion.
				</p>
			</section>

			<section id="minors" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">8.</span> Children's personal information
				</h2>
				<p class="mt-3">
					The Website is designed to be usable without providing any personal information, and we
					do not knowingly collect personal information from anyone, including children. If you
					are a minor, use a made-up display name and never post your real name, school,
					location, or anything else identifying — that rule is in our
					<a href="/legal/terms-of-service" class="font-semibold text-primary hover:underline"
						>Terms of Use</a
					>
					for everyone. If you believe a child has posted personal information on the Website,
					contact us and we will remove it.
				</p>
			</section>

			<section id="retention" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">9.</span> Retention and removal
				</h2>
				<p class="mt-3">
					Public content stays up until it is removed — by moderation or at our discretion. Usage
					events are kept in coarse, aggregate-oriented form. If something on the Website exposes
					your personal information and you want it taken down, reach us through the
					<a href="/contact" class="font-semibold text-primary hover:underline">contact page</a>
					and we will look at it.
				</p>
			</section>

			<section id="changes" class="scroll-mt-24">
				<h2 class="text-xl font-black uppercase tracking-tight text-base-content">
					<span class="text-base-content/40">10.</span> Changes to this policy
				</h2>
				<p class="mt-3">
					If this Privacy Policy changes, the "Last updated" date at the top changes with it.
					Continuing to use the Website after an update means you accept the new version.
				</p>
			</section>
		</div>
	</div>
</div>
