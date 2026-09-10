import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

// Multi-window workspace: open games/apps/site pages in floating windows that
// can be dragged, resized, and snapped (halves/quarters/full) like macOS tiling.
// Windows iframe site routes (the layout hides nav/footer inside iframes) or
// direct game content URLs. State persists in localStorage so a reload keeps
// the workspace.

export type SnapZone = 'free' | 'max' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br';

export interface KzWindow {
	id: string;
	title: string;
	url: string;
	icon?: string; // iconify icon name
	x: number;
	y: number;
	w: number;
	h: number;
	z: number;
	minimized: boolean;
	snap: SnapZone;
	// rect to restore when un-snapping / un-maximizing
	prev?: { x: number; y: number; w: number; h: number };
}

const STORAGE_KEY = 'kz_windows_v1';
export const MAX_WINDOWS = 8;
export const MIN_W = 320;
export const MIN_H = 220;

let zCounter = 10;
let idCounter = 1;

function load(): KzWindow[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const wins = parsed.filter(
			(w) => w && typeof w.id === 'string' && typeof w.url === 'string'
		) as KzWindow[];
		for (const w of wins) {
			zCounter = Math.max(zCounter, (w.z || 0) + 1);
			const n = parseInt(w.id.replace(/\D/g, ''), 10);
			if (!isNaN(n)) idCounter = Math.max(idCounter, n + 1);
		}
		return wins.slice(0, MAX_WINDOWS);
	} catch {
		return [];
	}
}

export const windows = writable<KzWindow[]>(load());

if (browser) {
	windows.subscribe((wins) => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(wins));
		} catch {
			/* storage full/blocked — workspace just won't persist */
		}
	});
}

/** Workspace bounds: viewport minus the top nav band and small margins. */
export function workspaceBounds() {
	const navH = 72;
	return {
		x: 8,
		y: navH + 8,
		w: Math.max(MIN_W, window.innerWidth - 16),
		h: Math.max(MIN_H, window.innerHeight - navH - 16)
	};
}

export function snapRect(zone: SnapZone) {
	const b = workspaceBounds();
	const halfW = Math.floor(b.w / 2);
	const halfH = Math.floor(b.h / 2);
	switch (zone) {
		case 'max':
			return { x: b.x, y: b.y, w: b.w, h: b.h };
		case 'left':
			return { x: b.x, y: b.y, w: halfW, h: b.h };
		case 'right':
			return { x: b.x + b.w - halfW, y: b.y, w: halfW, h: b.h };
		case 'tl':
			return { x: b.x, y: b.y, w: halfW, h: halfH };
		case 'tr':
			return { x: b.x + b.w - halfW, y: b.y, w: halfW, h: halfH };
		case 'bl':
			return { x: b.x, y: b.y + b.h - halfH, w: halfW, h: halfH };
		case 'br':
			return { x: b.x + b.w - halfW, y: b.y + b.h - halfH, w: halfW, h: halfH };
		default:
			return null;
	}
}

export function openWindow(opts: { title: string; url: string; icon?: string }) {
	if (!browser) return;
	const wins = get(windows);
	// Re-focus an existing window for the same URL instead of duplicating it.
	const existing = wins.find((w) => w.url === opts.url);
	if (existing) {
		focusWindow(existing.id);
		if (existing.minimized) toggleMinimize(existing.id);
		return;
	}
	if (wins.length >= MAX_WINDOWS) return;
	const b = workspaceBounds();
	const cascade = (wins.length % 6) * 32;
	const w = Math.min(760, b.w - 40);
	const h = Math.min(500, b.h - 40);
	const win: KzWindow = {
		id: 'win' + idCounter++,
		title: opts.title,
		url: opts.url,
		icon: opts.icon,
		x: Math.min(b.x + 24 + cascade, b.x + b.w - w),
		y: Math.min(b.y + 16 + cascade, b.y + b.h - h),
		w,
		h,
		z: zCounter++,
		minimized: false,
		snap: 'free'
	};
	windows.set([...wins, win]);
}

export function closeWindow(id: string) {
	windows.update((wins) => wins.filter((w) => w.id !== id));
}

export function closeAll() {
	windows.set([]);
}

export function focusWindow(id: string) {
	windows.update((wins) => wins.map((w) => (w.id === id ? { ...w, z: zCounter++ } : w)));
}

export function toggleMinimize(id: string) {
	windows.update((wins) =>
		wins.map((w) => (w.id === id ? { ...w, minimized: !w.minimized, z: zCounter++ } : w))
	);
}

export function setRect(id: string, rect: { x: number; y: number; w: number; h: number }) {
	windows.update((wins) => wins.map((w) => (w.id === id ? { ...w, ...rect, snap: 'free' } : w)));
}

export function snapWindow(id: string, zone: SnapZone) {
	const rect = snapRect(zone);
	windows.update((wins) =>
		wins.map((w) => {
			if (w.id !== id) return w;
			if (!rect || zone === 'free') {
				// restore
				const prev = w.prev;
				return prev
					? { ...w, ...prev, snap: 'free', prev: undefined, z: zCounter++ }
					: { ...w, snap: 'free', z: zCounter++ };
			}
			const prev = w.snap === 'free' ? { x: w.x, y: w.y, w: w.w, h: w.h } : w.prev;
			return { ...w, ...rect, snap: zone, prev, minimized: false, z: zCounter++ };
		})
	);
}

/** Toggle maximize (double-click on the title bar / zoom button). */
export function toggleMaximize(id: string) {
	const win = get(windows).find((w) => w.id === id);
	if (!win) return;
	snapWindow(id, win.snap === 'max' ? 'free' : 'max');
}
