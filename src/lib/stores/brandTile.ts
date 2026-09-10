import { derived, writable } from 'svelte/store';

/**
 * True while some page renders the left-rail brand tile (GameRail). The Nav hides
 * its own wordmark then — the tile IS the site title on those pages — and the tile
 * merges up into the nav. Counter-based so back-to-back page swaps (new rail
 * mounting before the old one's onDestroy fires) can't flicker the flag off.
 */
const railCount = writable(0);

export const brandTileMerged = derived(railCount, (n) => n > 0);

/** Register a mounted brand tile; call the returned function on destroy. */
export function registerBrandTile(): () => void {
	railCount.update((n) => n + 1);
	let done = false;
	return () => {
		if (done) return;
		done = true;
		railCount.update((n) => Math.max(0, n - 1));
	};
}
