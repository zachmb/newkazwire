import { browser } from '$app/environment';

// GA4 Measurement ID for the Kazwire property. MUST stay in sync with the gtag.js
// loader hardcoded in src/app.html. gtag.js reports by Measurement ID, so the SAME
// id works across every domain Kazwire is served from — the hostname is just a
// dimension, no per-domain setup needed.
export const GA4_ID = 'G-5FV89GN2T2';

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
	}
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
		page_title: document.title
	});
}
