<script lang="ts">
	// Party rooms lobby — create or join a jklm.fun-style room.
	// Mobbin ref: Jackbox / Among Us lobby (big code entry + name) — https://mobbin.com/apps/among-us-ios
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import { getPlayerName, setPlayerName } from '$lib/utils/streak';

	let name = '';
	let code = '';

	function saveName() {
		if (name.trim()) setPlayerName(name.trim());
	}

	function randomCode() {
		const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
		return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
	}

	function create() {
		saveName();
		if (!name.trim()) return;
		goto(`/rooms/${randomCode()}`);
	}

	function join() {
		saveName();
		if (!name.trim()) return;
		const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
		if (c.length < 3) return;
		goto(`/rooms/${c}`);
	}

	onMount(() => {
		const n = getPlayerName();
		if (n && n !== 'Anonymous') name = n;
	});
</script>


<div class="min-h-screen bg-base-100">
	<div class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10">
		<div class="text-center">
			<div class="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-4xl text-primary">
				<Icon icon="mdi:account-group" />
			</div>
			<h1 class="text-3xl font-black tracking-tight text-base-content">Party Rooms</h1>
			<p class="mt-1 text-sm text-base-content/60">Create a room, invite friends with the code, and play together — the leader picks a game and everyone jumps in. Or battle it out in BombParty.</p>
		</div>

		<div class="flex flex-col gap-4 rounded-3xl bg-base-200 p-6 ring-1 ring-base-300">
			<label class="flex flex-col gap-1">
				<span class="text-xs font-bold uppercase tracking-wider text-base-content/50">Your name</span>
				<input class="input input-bordered w-full" placeholder="Enter a display name" maxlength="24" bind:value={name} />
			</label>

			<button class="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-white transition hover:brightness-110 disabled:opacity-40" on:click={create} disabled={!name.trim()}>
				<Icon icon="mdi:plus-circle" class="text-xl" /> Create a room
			</button>

			<div class="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-base-content/40">
				<div class="h-px flex-1 bg-base-300"></div> or join <div class="h-px flex-1 bg-base-300"></div>
			</div>

			<div class="flex gap-2">
				<input class="input input-bordered w-full flex-1 text-center text-xl font-black uppercase tracking-[0.3em]" placeholder="CODE" maxlength="6" bind:value={code} on:keydown={(e) => e.key === 'Enter' && join()} />
				<button class="flex items-center gap-2 rounded-xl bg-secondary px-5 py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-40" on:click={join} disabled={!name.trim() || code.trim().length < 3}>
					Join
				</button>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1 rounded-2xl bg-base-200 p-4 ring-1 ring-base-300">
				<Icon icon="mdi:gamepad-variant" class="text-2xl text-primary" />
				<span class="font-bold text-base-content">Play together</span>
				<span class="text-xs text-base-content/60">The leader pushes any Kazwire game to the whole room.</span>
			</div>
			<div class="flex flex-col gap-1 rounded-2xl bg-base-200 p-4 ring-1 ring-base-300">
				<Icon icon="mdi:bomb" class="text-2xl text-primary" />
				<span class="font-bold text-base-content">BombParty</span>
				<span class="text-xs text-base-content/60">Type a word with the syllable before the bomb blows. Last one standing wins.</span>
			</div>
		</div>
	</div>
</div>
