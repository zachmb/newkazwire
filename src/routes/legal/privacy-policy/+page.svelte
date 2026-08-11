<script lang="ts">
	import { config } from '$lib/config';
</script>

<svelte:head>
	<meta property="og:title" content="{config.branding.name} - Privacy Policy" />
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
			<h1 class="text-5xl font-black tracking-tight text-[#5B9BFF] md:text-6xl">Privacy Policy</h1>
			<p class="mx-auto mt-6 max-w-xl text-xl font-bold text-white/60">
				Your trust is our most valuable asset.
			</p>
		</div>

		<!-- Content -->
		<div class="px-8 py-12 md:px-20 md:py-20">
			<article
				class="prose prose-lg prose-neutral max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-base-content prose-p:font-medium prose-p:leading-relaxed prose-p:text-base-content/70 prose-li:font-medium prose-li:text-base-content/70"
			>
				<p>
					At {config.branding.name}, accessible from {config.branding.mainDomain}, one of our main
					priorities is the privacy of our visitors. This Privacy Policy document contains types of
					information that is collected and recorded by {config.branding.name} and how we use it.
				</p>

				<h2>Contact Information</h2>
				<p>
					If you have additional questions or require more information about our Privacy Policy, do
					not hesitate to contact us.
				</p>

				<h2>Scope</h2>
				<p>
					This Privacy Policy applies only to our online activities and is valid for visitors to our
					website with regards to the information that they shared and/or collect in {config
						.branding.name}. This policy is not applicable to any information collected offline or
					via channels other than this website.
				</p>

				<h2>Consent</h2>
				<p>
					By using our website, you hereby consent to our Privacy Policy and agree to its terms.
				</p>

				<h2>Information we collect</h2>
				<p>
					The personal information that you are asked to provide, and the reasons why you are asked
					to provide it, will be made clear to you at the point we ask you to provide your personal
					information.
				</p>

				<h2>How we use your information</h2>
				<p>We use the information we collect in various ways, including to:</p>
				<ul>
					<li>Provide, operate, and maintain our website</li>
					<li>Improve, personalize, and expand our website</li>
					<li>Understand and analyze how you use our website</li>
					<li>Develop new products, services, features, and functionality</li>
					<li>Communicate with you for customer service and updates</li>
					<li>Send you emails and prevent fraud</li>
				</ul>

				<h2>Children's Information</h2>
				<p>
					Another part of our priority is adding protection for children while using the internet.
					We encourage parents and guardians to observe, participate in, and/or monitor and guide
					their online activity.
				</p>
				<p>
					{config.branding.name} does not knowingly collect any Personal Identifiable Information from
					children under the age of 13.
				</p>
			</article>
		</div>
	</div>
</div>
