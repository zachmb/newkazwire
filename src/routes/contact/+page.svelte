<script lang="ts">
	import { page } from '$app/stores';
	import { config } from '$lib/config';
	import Icon from '@iconify/svelte';

	let name = '';
	let email = '';
	let message = '';

	function send(e: Event) {
		e.preventDefault();
		const subject = encodeURIComponent(`Message from ${name || 'a player'}`);
		const body = encodeURIComponent(`${message}\n\n— ${name}${email ? ` (${email})` : ''}`);
		window.location.href = `mailto:${config.branding.supportEmail}?subject=${subject}&body=${body}`;
	}

	const channels = [
		{ icon: 'mdi:email', label: 'Email us', value: config.branding.supportEmail, href: `mailto:${config.branding.supportEmail}` },
		{ icon: 'ic:baseline-discord', label: 'Community', value: 'Join our Discord', href: 'https://joinkaz.com' },
		{ icon: 'mdi:twitter', label: 'Updates', value: 'Follow us', href: 'https://twitter.com' }
	];
</script>

<svelte:head>
	<meta name="description" content="Get in touch with the {$page.url.hostname} team." />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-12 sm:py-16">
	<div class="overflow-hidden rounded-3xl bg-base-200 shadow-sm ring-1 ring-black/5">
		<div class="grid grid-cols-1 md:grid-cols-2">
			<!-- Info -->
			<div class="bg-gradient-to-br from-[#0B1220] to-[#2563EB] p-8 text-white md:p-12">
				<h1 class="text-4xl font-black tracking-tight">Get in touch</h1>
				<p class="mt-4 text-lg text-white/80">
					Questions, feedback, or a game to request? We'd love to hear from you.
				</p>
				<div class="mt-10 space-y-6">
					{#each channels as c}
						<a href={c.href} class="flex items-center gap-4 transition hover:opacity-90" target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
							<div class="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#FF9F1C]">
								<Icon icon={c.icon} class="text-2xl" />
							</div>
							<div>
								<p class="text-xs font-bold uppercase tracking-wider text-white/50">{c.label}</p>
								<p class="text-lg font-bold">{c.value}</p>
							</div>
						</a>
					{/each}
				</div>
			</div>

			<!-- Form -->
			<div class="bg-base-100 p-8 md:p-12">
				<form on:submit={send} class="flex flex-col gap-5">
					<div>
						<label for="name" class="mb-2 block text-xs font-black uppercase tracking-widest text-base-content/50">Your name</label>
						<input id="name" bind:value={name} type="text" placeholder="Alex Player" class="w-full rounded-2xl border-2 border-base-300 bg-base-200 p-4 font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100" />
					</div>
					<div>
						<label for="email" class="mb-2 block text-xs font-black uppercase tracking-widest text-base-content/50">Email</label>
						<input id="email" bind:value={email} type="email" placeholder="you@example.com" class="w-full rounded-2xl border-2 border-base-300 bg-base-200 p-4 font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100" />
					</div>
					<div>
						<label for="message" class="mb-2 block text-xs font-black uppercase tracking-widest text-base-content/50">Message</label>
						<textarea id="message" bind:value={message} rows="5" placeholder="What's on your mind?" class="w-full rounded-2xl border-2 border-base-300 bg-base-200 p-4 font-semibold text-base-content outline-none transition focus:border-primary focus:bg-base-100"></textarea>
					</div>
					<button type="submit" class="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]">
						<Icon icon="mdi:send" class="text-xl" /> Send message
					</button>
				</form>
			</div>
		</div>
	</div>
</div>
