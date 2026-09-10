<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import {
		windows,
		openWindow,
		closeWindow,
		closeAll,
		focusWindow,
		toggleMinimize,
		toggleMaximize,
		setRect,
		snapWindow,
		snapRect,
		workspaceBounds,
		MIN_W,
		MIN_H,
		type KzWindow,
		type SnapZone
	} from '$lib/stores/windows';

	// Desktop-style floating windows + snap tiling (halves/quarters/full, like
	// macOS window tiling). Windows iframe site routes or direct game URLs; the
	// root layout hides nav/footer for pages rendered inside an iframe.

	let dragging: {
		id: string;
		mode: 'move' | string; // 'move' or a resize handle: n s e w ne nw se sw
		startX: number;
		startY: number;
		rect: { x: number; y: number; w: number; h: number };
	} | null = null;

	// Live rect while dragging (applied to the store on release).
	let liveRect: { x: number; y: number; w: number; h: number } | null = null;
	let previewZone: SnapZone | null = null;
	let tileMenuFor: string | null = null;

	// Persisted windows exist only client-side; render after mount so SSR and
	// hydration markup agree.
	let mounted = false;
	onMount(() => (mounted = true));
	$: anyWindows = mounted && $windows.length > 0;

	function startDrag(e: PointerEvent, win: KzWindow, mode: string) {
		if (e.button !== 0) return;
		e.preventDefault();
		focusWindow(win.id);
		tileMenuFor = null;
		// Un-snap on move so the window follows the pointer from its restore size.
		let rect = { x: win.x, y: win.y, w: win.w, h: win.h };
		if (mode === 'move' && win.snap !== 'free' && win.prev) {
			const rel = (e.clientX - win.x) / win.w;
			rect = { ...win.prev, x: e.clientX - win.prev.w * rel, y: win.y };
			snapWindow(win.id, 'free');
			setRect(win.id, rect);
		}
		dragging = { id: win.id, mode, startX: e.clientX, startY: e.clientY, rect };
		liveRect = { ...rect };
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp, { once: true });
	}

	function zoneAt(x: number, y: number): SnapZone | null {
		const b = workspaceBounds();
		const edge = 24;
		const corner = 140;
		const nearL = x < b.x + edge;
		const nearR = x > b.x + b.w - edge;
		const nearT = y < b.y + edge;
		const nearB = y > b.y + b.h - edge;
		if (nearL && y < b.y + corner) return 'tl';
		if (nearL && y > b.y + b.h - corner) return 'bl';
		if (nearR && y < b.y + corner) return 'tr';
		if (nearR && y > b.y + b.h - corner) return 'br';
		if (nearL) return 'left';
		if (nearR) return 'right';
		if (nearT) return 'max';
		if (nearB) return null;
		return null;
	}

	function onMove(e: PointerEvent) {
		if (!dragging || !liveRect) return;
		const dx = e.clientX - dragging.startX;
		const dy = e.clientY - dragging.startY;
		const r = dragging.rect;
		if (dragging.mode === 'move') {
			liveRect = { ...r, x: r.x + dx, y: Math.max(workspaceBounds().y - 8, r.y + dy) };
			previewZone = zoneAt(e.clientX, e.clientY);
		} else {
			let { x, y, w, h } = r;
			const m = dragging.mode;
			if (m.includes('e')) w = Math.max(MIN_W, r.w + dx);
			if (m.includes('s')) h = Math.max(MIN_H, r.h + dy);
			if (m.includes('w')) {
				w = Math.max(MIN_W, r.w - dx);
				x = r.x + (r.w - w);
			}
			if (m.includes('n')) {
				h = Math.max(MIN_H, r.h - dy);
				y = r.y + (r.h - h);
			}
			liveRect = { x, y, w, h };
		}
	}

	function onUp(e: PointerEvent) {
		window.removeEventListener('pointermove', onMove);
		if (dragging && liveRect) {
			if (dragging.mode === 'move' && previewZone) {
				snapWindow(dragging.id, previewZone);
			} else {
				setRect(dragging.id, liveRect);
			}
		}
		dragging = null;
		liveRect = null;
		previewZone = null;
	}

	// live is passed in from the template so the {@const} re-evaluates as the
	// pointer moves (Svelte only tracks identifiers referenced in the expression).
	function rectFor(win: KzWindow, live: typeof liveRect, drag: typeof dragging) {
		if (drag && drag.id === win.id && live) return live;
		return { x: win.x, y: win.y, w: win.w, h: win.h };
	}

	function previewStyle(zone: SnapZone) {
		const r = snapRect(zone);
		if (!r) return '';
		return `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;`;
	}

	const tiles: { zone: SnapZone; icon: string; label: string }[] = [
		{ zone: 'left', icon: 'mdi:dock-left', label: 'Left half' },
		{ zone: 'right', icon: 'mdi:dock-right', label: 'Right half' },
		{ zone: 'tl', icon: 'mdi:arrow-top-left', label: 'Top left' },
		{ zone: 'tr', icon: 'mdi:arrow-top-right', label: 'Top right' },
		{ zone: 'bl', icon: 'mdi:arrow-bottom-left', label: 'Bottom left' },
		{ zone: 'br', icon: 'mdi:arrow-bottom-right', label: 'Bottom right' },
		{ zone: 'max', icon: 'mdi:fullscreen', label: 'Fill screen' },
		{ zone: 'free', icon: 'mdi:restore', label: 'Restore' }
	];

	const launchers = [
		{ title: 'Games', url: '/', icon: 'mdi:gamepad-variant' },
		{ title: 'Browser', url: '/study', icon: 'mdi:web' },
		{ title: 'Feed', url: '/feed', icon: 'mdi:play-box-multiple' },
		{ title: 'Rooms', url: '/rooms', icon: 'mdi:account-group' },
		{ title: 'Apps', url: '/apps', icon: 'mdi:apps' }
	];
	let launcherOpen = false;

	const resizeHandles: { m: string; cls: string }[] = [
		{ m: 'n', cls: 'left-2 right-2 -top-1 h-2 cursor-ns-resize' },
		{ m: 's', cls: 'left-2 right-2 -bottom-1 h-2 cursor-ns-resize' },
		{ m: 'w', cls: 'top-2 bottom-2 -left-1 w-2 cursor-ew-resize' },
		{ m: 'e', cls: 'top-2 bottom-2 -right-1 w-2 cursor-ew-resize' },
		{ m: 'nw', cls: '-left-1 -top-1 h-3 w-3 cursor-nwse-resize' },
		{ m: 'ne', cls: '-right-1 -top-1 h-3 w-3 cursor-nesw-resize' },
		{ m: 'sw', cls: '-left-1 -bottom-1 h-3 w-3 cursor-nesw-resize' },
		{ m: 'se', cls: '-right-1 -bottom-1 h-3 w-3 cursor-nwse-resize' }
	];
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Escape') {
			tileMenuFor = null;
			launcherOpen = false;
		}
	}}
/>

{#if anyWindows}
	<div class="pointer-events-none fixed inset-0 z-[600] hidden lg:block">
		<!-- Snap preview ghost -->
		{#if previewZone}
			<div
				class="absolute rounded-xl border-2 border-primary bg-primary/10 transition-all duration-75"
				style={previewStyle(previewZone)}
			/>
		{/if}

		{#each $windows as win (win.id)}
			{@const r = rectFor(win, liveRect, dragging)}
			{#if !win.minimized}
				<section
					data-kz-window={win.id}
					class="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border border-base-content/10 bg-base-100 shadow-md"
					style="left:{r.x}px;top:{r.y}px;width:{r.w}px;height:{r.h}px;z-index:{win.z};"
					on:pointerdown={() => focusWindow(win.id)}
				>
					<!-- Title bar -->
					<header
						class="flex h-9 flex-none cursor-grab select-none items-center gap-2 border-b border-base-content/10 bg-base-200 px-2 active:cursor-grabbing"
						on:pointerdown={(e) => startDrag(e, win, 'move')}
						on:dblclick={() => toggleMaximize(win.id)}
					>
						<!-- Traffic lights -->
						<div class="flex items-center gap-1.5" on:pointerdown|stopPropagation>
							<button
								class="grid h-4 w-4 place-items-center rounded-full bg-error text-error-content/0 transition hover:text-error-content"
								aria-label="Close window"
								on:click={() => closeWindow(win.id)}
							>
								<Icon icon="mdi:close" class="text-[10px]" />
							</button>
							<button
								class="grid h-4 w-4 place-items-center rounded-full bg-warning text-warning-content/0 transition hover:text-warning-content"
								aria-label="Minimize window"
								on:click={() => toggleMinimize(win.id)}
							>
								<Icon icon="mdi:minus" class="text-[10px]" />
							</button>
							<div class="relative">
								<button
									class="grid h-4 w-4 place-items-center rounded-full bg-primary text-white/0 transition hover:text-white"
									aria-label="Snap window"
									on:click={() => (tileMenuFor = tileMenuFor === win.id ? null : win.id)}
								>
									<Icon icon="mdi:arrow-expand" class="text-[10px]" />
								</button>
								{#if tileMenuFor === win.id}
									<!-- macOS-style tile menu -->
									<div
										class="absolute left-0 top-6 z-10 grid w-44 grid-cols-2 gap-1 rounded-xl border border-base-content/10 bg-base-100 p-2 shadow-md"
									>
										{#each tiles as t}
											<button
												class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
												on:click={() => {
													snapWindow(win.id, t.zone);
													tileMenuFor = null;
												}}
											>
												<Icon icon={t.icon} class="text-sm text-primary" />
												{t.label}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<div class="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2">
							{#if win.icon}<Icon icon={win.icon} class="flex-none text-sm text-base-content/50" />{/if}
							<span class="truncate text-xs font-bold text-base-content/70">{win.title}</span>
						</div>
						<!-- spacer to balance traffic lights so the title centers -->
						<div class="w-[52px] flex-none" />
					</header>

					<!-- Content -->
					<div class="relative min-h-0 flex-1 bg-black">
						<iframe
							src={win.url}
							title={win.title}
							class="h-full w-full bg-base-100"
							allow="accelerometer; gyroscope; gamepad; autoplay; clipboard-write; clipboard-read; fullscreen"
						/>
						<!-- Shield: while dragging/resizing ANY window, cover iframes so they
						     don't swallow pointer events mid-gesture. -->
						{#if dragging}
							<div class="absolute inset-0" />
						{/if}
					</div>

					<!-- Resize handles -->
					{#each resizeHandles as h}
						<div
							class="absolute {h.cls}"
							on:pointerdown={(e) => startDrag(e, win, h.m)}
						/>
					{/each}
				</section>
			{/if}
		{/each}
	</div>
{/if}

<!-- Dock -->
{#if anyWindows}
	<div
		class="fixed bottom-3 left-1/2 z-[650] hidden -translate-x-1/2 items-center gap-1 rounded-full border border-base-content/10 bg-base-100 px-2 py-1.5 shadow-md lg:flex"
	>
		{#each $windows as win (win.id)}
			<button
				class="flex max-w-40 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition {win.minimized
					? 'text-base-content/40 hover:bg-base-200 hover:text-base-content'
					: 'bg-base-200 text-base-content hover:bg-primary/10'}"
				title={win.minimized ? 'Restore' : 'Minimize'}
				on:click={() => toggleMinimize(win.id)}
			>
				{#if win.icon}<Icon icon={win.icon} class="flex-none text-sm text-primary" />{/if}
				<span class="truncate">{win.title}</span>
			</button>
		{/each}
		<div class="mx-1 h-5 w-px bg-base-content/10" />
		<div class="relative">
			<button
				class="grid h-8 w-8 place-items-center rounded-full text-base-content/60 transition hover:bg-base-200 hover:text-primary"
				aria-label="Open a new window"
				on:click={() => (launcherOpen = !launcherOpen)}
			>
				<Icon icon="mdi:plus" class="text-lg" />
			</button>
			{#if launcherOpen}
				<div
					class="absolute bottom-11 left-1/2 w-40 -translate-x-1/2 rounded-xl border border-base-content/10 bg-base-100 p-2 shadow-md"
				>
					{#each launchers as l}
						<button
							class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-bold text-base-content/70 transition hover:bg-base-200 hover:text-base-content"
							on:click={() => {
								openWindow(l);
								launcherOpen = false;
							}}
						>
							<Icon icon={l.icon} class="text-sm text-primary" />
							{l.title}
						</button>
					{/each}
				</div>
			{/if}
		</div>
		<button
			class="grid h-8 w-8 place-items-center rounded-full text-base-content/60 transition hover:bg-base-200 hover:text-error"
			aria-label="Close all windows"
			title="Close all windows"
			on:click={closeAll}
		>
			<Icon icon="mdi:close" class="text-lg" />
		</button>
	</div>
{/if}
