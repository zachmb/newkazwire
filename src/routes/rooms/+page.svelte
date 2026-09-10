<script lang="ts">
	// Rooms lobby — jklm.fun-style: land, see live joinable rooms, click one.
	// Mobbin ref: Jackbox / Among Us lobby (big code entry + name) — https://mobbin.com/apps/among-us-ios
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { config } from '$lib/config';
	import { getPlayerName, setPlayerName } from '$lib/utils/streak';

	let name = '';
	let code = '';
	let nameInput: HTMLInputElement;

	// Live public room list, polled from the party server while the tab is visible.
	type ActiveRoom = { code: string; players: number; mode: 'lobby' | 'push' | 'bomb'; game: string | null };
	const MAX_PLAYERS_PER_ROOM = 16;
	let activeRooms: ActiveRoom[] = [];
	let roomsLoaded = false;
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	function roomsUrl() {
		// Mirrors the room page's ws URL choice (ws://localhost:8091 in dev, same host in prod).
		if (import.meta.env.DEV) return 'http://localhost:8091/party/rooms';
		return `${location.protocol}//${location.host}/party/rooms`;
	}

	async function fetchRooms() {
		try {
			const r = await fetch(roomsUrl());
			const j = await r.json();
			activeRooms = Array.isArray(j.rooms) ? j.rooms : [];
		} catch {
			/* party server unreachable — keep whatever we last had */
		}
		roomsLoaded = true;
	}

	function modeLabel(r: ActiveRoom) {
		if (r.mode === 'bomb') return 'Word bomb';
		if (r.mode === 'push') return r.game ? `In game: ${r.game}` : 'In game';
		return 'Lobby';
	}

	function saveName() {
		if (name.trim()) setPlayerName(name.trim());
	}

	function randomCode() {
		const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
		return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('');
	}

	function create() {
		saveName();
		if (!name.trim()) {
			nameInput?.focus();
			return;
		}
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

		// Poll the live room list every 5s, but only while the page is visible.
		const startPoll = () => {
			if (!pollTimer) pollTimer = setInterval(fetchRooms, 5000);
		};
		const stopPoll = () => {
			if (pollTimer) {
				clearInterval(pollTimer);
				pollTimer = null;
			}
		};
		const onVisibility = () => {
			if (document.hidden) stopPoll();
			else {
				fetchRooms();
				startPoll();
			}
		};
		fetchRooms();
		startPoll();
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			stopPoll();
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});
</script>


<div class="min-h-screen bg-base-100">
	<div class="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
		<div class="text-center">
			<div class="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-xl bg-primary/10 text-4xl text-primary">
				<Icon icon="mdi:account-group" />
			</div>
			<h1 class="text-3xl font-black tracking-tight text-base-content">Rooms</h1>
			<p class="mt-1 text-sm text-base-content/60">Jump into a live room, or create your own and invite friends with the code — the leader picks a game and everyone jumps in. Or battle it out in BombParty.</p>
		</div>

		<!-- Active rooms — the jklm.fun-style lead: you land, you see rooms, you click one. -->
		<section class="flex flex-col gap-3">
			<h2 class="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-base-content/60">
				<Icon icon="mdi:access-point" class="text-primary" /> Active rooms
				{#if activeRooms.length}<span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{activeRooms.length}</span>{/if}
			</h2>
			{#if activeRooms.length}
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each activeRooms as r (r.code)}
						<div class="flex flex-col gap-3 rounded-box border border-base-content/10 bg-base-200 p-4">
							<div class="flex items-start justify-between gap-2">
								<div>
									<div class="text-xs font-bold uppercase tracking-wider text-base-content/50">Room</div>
									<div class="text-2xl font-black tracking-[0.2em] text-base-content">{r.code}</div>
								</div>
								<span class="rounded-full px-2.5 py-1 text-xs font-bold {r.mode === 'lobby' ? 'bg-base-content/10 text-base-content/60' : 'bg-primary/10 text-primary'}">{modeLabel(r)}</span>
							</div>
							<div class="flex items-center justify-between gap-2">
								<span class="flex items-center gap-1.5 text-sm font-semibold text-base-content/60">
									<Icon icon="mdi:account-multiple" /> {r.players}/{MAX_PLAYERS_PER_ROOM} playing
								</span>
								<a href="/rooms/{r.code}" class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:brightness-110">
									Join <Icon icon="mdi:arrow-right" />
								</a>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="flex flex-col items-center gap-3 rounded-box border border-base-content/10 bg-base-200 p-8 text-center">
					<Icon icon="mdi:account-group" class="text-4xl text-primary/30" />
					<p class="text-sm text-base-content/60">
						{#if roomsLoaded}No open rooms right now — start one and it'll show up here for everyone.{:else}Looking for open rooms…{/if}
					</p>
					<button class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110" on:click={create}>
						<Icon icon="mdi:plus-circle" /> Create a room
					</button>
				</div>
			{/if}
		</section>

		<div class="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-box border border-base-content/10 bg-base-200 p-6">
			<label class="flex flex-col gap-1">
				<span class="text-xs font-bold uppercase tracking-wider text-base-content/50">Your name</span>
				<input class="input input-bordered w-full" placeholder="Enter a display name" maxlength="24" bind:value={name} bind:this={nameInput} />
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

		<div class="mx-auto grid w-full max-w-lg grid-cols-2 gap-3">
			<div class="flex flex-col gap-1 rounded-box border border-base-content/10 bg-base-200 p-4">
				<Icon icon="mdi:gamepad-variant" class="text-2xl text-primary" />
				<span class="font-bold text-base-content">Play together</span>
				<span class="text-xs text-base-content/60">The leader pushes any game to the whole room.</span>
			</div>
			<div class="flex flex-col gap-1 rounded-box border border-base-content/10 bg-base-200 p-4">
				<Icon icon="mdi:bomb" class="text-2xl text-primary" />
				<span class="font-bold text-base-content">BombParty</span>
				<span class="text-xs text-base-content/60">Type a word with the syllable before the bomb blows. Last one standing wins.</span>
			</div>
		</div>
	</div>
</div>
