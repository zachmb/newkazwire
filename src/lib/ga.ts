import { browser } from '$app/environment';

// GA4 Measurement ID for the Kazwire property. MUST stay in sync with the gtag.js
// loader hardcoded in src/app.html. gtag.js reports by Measurement ID, so the SAME
// id works across every domain Kazwire is served from — the hostname is just a
// dimension, no per-domain setup needed.
export const GA4_ID = 'G-FLBJ64LGWV';

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
	}
}

// Human-readable section labels for the first path segment. Anything not listed
// falls back to a title-cased version of the segment itself.
const SECTION_LABELS: Record<string, string> = {
	g: 'Game',
	apps: 'App',
	ai: 'AI',
	blog: 'Blog',
	legal: 'Legal',
	rooms: 'Room',
	feed: 'Feed',
	u: 'Profile'
};

// Dynamic-route slugs we want to show by name (so "Game · Subway Surfers" lands
// in GA instead of a raw "[id]"). The player-variant prefixes under /g collapse
// to the game itself.
const titleCase = (s: string) =>
	s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

/**
 * Build a readable GA page_title from the URL path — NOT document.title, which is
 * deliberately cloaked to the bare hostname (see +layout.svelte) for network
 * filters. GA still captures the domain itself via the Hostname dimension (derived
 * from page_location), so this gives per-page granularity on top of per-domain.
 */
export function gaPageTitle(url: URL): string {
	const segs = url.pathname.split('/').filter(Boolean);
	if (segs.length === 0) return 'Home';

	const section = segs[0];
	const label = SECTION_LABELS[section] ?? titleCase(section);

	// /g/emulator/[id] and /g/ruffle/[id] are player variants of a game — name the game.
	let rest = segs.slice(1);
	if (section === 'g' && (rest[0] === 'emulator' || rest[0] === 'ruffle')) rest = rest.slice(1);

	if (rest.length === 0) {
		// Bare section index (e.g. /g, /apps, /blog) — pluralize the common ones.
		if (section === 'g') return 'Games';
		if (section === 'apps') return 'Apps';
		return label;
	}
	return `${label} · ${titleCase(rest.join(' '))}`;
}

/**
 * Send a GA4 page_view for the current URL. The gtag config in app.html sets
 * send_page_view:false, so this is the single source of page_views — it must be
 * called on the initial load AND every SvelteKit client-side navigation (both of
 * which fire afterNavigate). SSR-safe and a no-op until gtag.js has defined window.gtag.
 */
export function gaPageview(url: URL = new URL(browser ? location.href : 'https://kazwire.com')) {
	if (!browser || typeof window.gtag !== 'function') return;
	window.gtag('event', 'page_view', {
		page_path: url.pathname + url.search,
		page_location: url.href,
		page_title: gaPageTitle(url)
	});
}
