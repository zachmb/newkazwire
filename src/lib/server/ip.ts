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
 * Public creator/player location is intentionally DISABLED — Kazwire no longer shows
 * where anyone is. Always returns "" so nothing is captured or displayed. (Kept as a
 * function so every caller keeps working; the getReal­Ip path above still runs for
 * rate-limiting/attribution by IP, which is server-only and never shown.)
 */
export async function geolocate(_ip: string): Promise<string> {
	return '';
}
