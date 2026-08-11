/**
 * Real client IP + coarse geolocation.
 *
 * Kazwire runs behind nginx, so SvelteKit's getClientAddress() returns 127.0.0.1
 * (the proxy hop) — which is why every published game was logged with creatorIp
 * 127.0.0.1/::1. The real visitor IP is the FIRST entry of X-Forwarded-For (nginx
 * sets it). Use getRealIp() everywhere a client IP matters (publish attribution,
 * per-IP rate limiting, telemetry).
 */

export function getRealIp(
	request: Request,
	getClientAddress: () => string
): string {
	const xff = request.headers.get('x-forwarded-for');
	if (xff) {
		// "client, proxy1, proxy2" — the client is the first, left-most entry.
		const first = xff.split(',')[0]?.trim();
		if (first) return first;
	}
	const real = request.headers.get('x-real-ip');
	if (real) return real.trim();
	try {
		return getClientAddress();
	} catch {
		return '';
	}
}

function isPrivateIp(ip: string): boolean {
	if (!ip) return true;
	return (
		ip === '::1' ||
		ip.startsWith('127.') ||
		ip.startsWith('10.') ||
		ip.startsWith('192.168.') ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
		ip.startsWith('fc') ||
		ip.startsWith('fd') ||
		ip === 'localhost'
	);
}

/**
 * Best-effort coarse location ("City, State, CC" — e.g. "Bellevue, WA, US") from an IP
 * for public creator attribution. Never throws and never blocks the caller for long: a
 * private/localhost IP or any lookup failure yields "" (the UI just omits the location).
 * Uses the keyless ip-api.com endpoint with a short timeout. The region falls back to
 * regionName when the short code is absent, and is skipped entirely if it duplicates the
 * city (some regions report the city as the region).
 */
export async function geolocate(ip: string): Promise<string> {
	if (isPrivateIp(ip)) return '';
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), 2500);
		const res = await fetch(
			`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,region,regionName,country,countryCode`,
			{ signal: controller.signal }
		);
		clearTimeout(t);
		if (!res.ok) return '';
		const d = await res.json();
		if (d.status !== 'success') return '';
		const city = (d.city || '').toString().trim();
		const region = (d.region || d.regionName || '').toString().trim();
		const cc = (d.countryCode || d.country || '').toString().trim();
		const parts = [city, region && region !== city ? region : '', cc].filter(Boolean);
		return parts.join(', ');
	} catch {
		return '';
	}
}
