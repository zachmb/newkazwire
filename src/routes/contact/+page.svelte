<script lang="ts">
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';
</script>

<svelte:head>
	<title>{config.branding.name} - Contact Us</title>
</svelte:head>

<div class="min-h-screen bg-[#5B9BFF] p-4 text-neutral md:p-8">
	<div class="mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
		<div class="grid grid-cols-1 md:grid-cols-2">
			<!-- Contact Info -->
			<div class="bg-gradient-to-br from-[#0B1B33] to-[#071022] p-8 text-white md:p-12">
				<h1 class="text-4xl font-black tracking-tight text-[#5B9BFF]">Get in Touch</h1>
				<p class="mt-4 text-lg text-white/70">
					Have a question, feedback, or just want to say hi? Hop right into our inbox!
				</p>

				<div class="mt-12 space-y-8">
					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#5B9BFF]"
						>
							<Icon icon="mdi:email" class="text-2xl" />
						</div>
						<div>
							<p class="text-sm font-bold uppercase tracking-wider text-white/40">Email Us</p>
							<p class="text-lg font-bold">hello@{config.branding.mainDomain}</p>
						</div>
					</div>

					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#5B9BFF]"
						>
							<Icon icon="mdi:discord" class="text-2xl" />
						</div>
						<div>
							<p class="text-sm font-bold uppercase tracking-wider text-white/40">Community</p>
							<p class="text-lg font-bold">Join our Discord</p>
						</div>
					</div>

					<div class="flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#5B9BFF]"
						>
							<Icon icon="mdi:twitter" class="text-2xl" />
						</div>
						<div>
							<p class="text-sm font-bold uppercase tracking-wider text-white/40">Stay Updated</p>
							<p class="text-lg font-bold">Follow @{config.branding.name}</p>
						</div>
					</div>
				</div>

				<!-- Decorative Frog Element -->
				<div class="mt-20 flex justify-center opacity-10">
					<img src="/logo.png" alt="" class="h-32 w-32 rounded-full grayscale" />
				</div>
			</div>

			<!-- Contact Form -->
			<div class="p-8 md:p-12">
				<form on:submit|preventDefault class="flex flex-col gap-6">
					<div>
						<label
							for="name"
							class="mb-2 block text-sm font-black uppercase tracking-widest text-neutral/40"
							>Your Name</label
						>
						<input
							type="text"
							id="name"
							placeholder="Froggy McHopper"
							class="w-full rounded-2xl border-2 border-neutral/5 bg-neutral/5 p-4 font-bold outline-none transition-all focus:border-[#5B9BFF] focus:bg-white"
						/>
					</div>

					<div>
						<label
							for="email"
							class="mb-2 block text-sm font-black uppercase tracking-widest text-neutral/40"
							>Email Address</label
						>
						<input
							type="email"
							id="email"
							placeholder="froggy@pond.com"
							class="w-full rounded-2xl border-2 border-neutral/5 bg-neutral/5 p-4 font-bold outline-none transition-all focus:border-[#5B9BFF] focus:bg-white"
						/>
					</div>

					<div>
						<label
							for="message"
							class="mb-2 block text-sm font-black uppercase tracking-widest text-neutral/40"
							>Message</label
						>
						<textarea
							id="message"
							rows="5"
							placeholder="What's jumping?"
							class="w-full rounded-2xl border-2 border-neutral/5 bg-neutral/5 p-4 font-bold outline-none transition-all focus:border-[#5B9BFF] focus:bg-white"
						/>
					</div>

					<button
						class="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#0B1B33] py-4 text-lg font-black text-[#5B9BFF] shadow-xl transition-all hover:scale-[1.02] hover:bg-[#071022] active:scale-[0.98]"
					>
						<Icon icon="mdi:send" class="text-xl" />
						Send Message
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
