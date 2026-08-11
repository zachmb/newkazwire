<script lang="ts">
	import { config } from '$lib/config';
</script>

<svelte:head>
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
			<h1 class="text-5xl font-black tracking-tight text-[#5B9BFF] md:text-6xl">DMCA Policy</h1>
			<p class="mx-auto mt-6 max-w-xl text-xl font-bold text-white/60">
				Respecting intellectual property rights.
			</p>
		</div>

		<!-- Content -->
		<div class="px-8 py-12 md:px-20 md:py-20">
			<article
				class="prose prose-lg prose-neutral max-w-none prose-headings:font-black prose-headings:tracking-tight prose-headings:text-base-content prose-p:font-medium prose-p:leading-relaxed prose-p:text-base-content/70 prose-li:font-medium prose-li:text-base-content/70"
			>
				<p>
					{config.branding.name} respects the intellectual property rights of others and expects its
					users to do the same. In accordance with the Digital Millennium Copyright Act of 1998, the
					text of which may be found on the U.S. Copyright Office website, {config.branding.name}
					will respond expeditiously to claims of copyright infringement.
				</p>

				<h2>Reporting Infringement</h2>
				<p>
					If you are a copyright owner, or are authorized to act on behalf of one, please report
					alleged copyright infringements taking place on or through the Site by completing a Notice
					of Alleged Infringement and delivering it to our designated agent.
				</p>

				<h2>A Notice must include:</h2>
				<ul>
					<li>Identification of the copyrighted work claimed to have been infringed.</li>
					<li>Identification of the material that is claimed to be infringing.</li>
					<li>Your contact information (address, phone number, and email).</li>
					<li>A statement of good faith belief.</li>
					<li>A statement that the information in the notification is accurate.</li>
					<li>A physical or electronic signature.</li>
				</ul>

				<h2>Contact Our Agent</h2>
				<p>
					You can reach our DMCA agent at:
					<br />
					<strong>Email:</strong> dmca@{config.branding.mainDomain}
				</p>
			</article>
		</div>
	</div>
</div>
