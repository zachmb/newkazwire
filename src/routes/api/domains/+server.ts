import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRealIp } from '$lib/server/ip';
import {
	KAZWIRE_SERVER_IP,
	addDomain,
	countDomains,
	isServable,
	normalizeDomain,
	rateLimit
} from '$lib/server/domains';

/** GET /api/domains            -> { count }
 *  GET /api/domains?check=foo  -> { domain, live }  (is it registered/served + points at us) */
export const GET: RequestHandler = async ({ url }) => {
	const check = url.searchParams.get('check');
	if (check) {
		const { domain, error } = normalizeDomain(check);
		if (!domain) return json({ error }, { status: 400 });
		const registered = isServable(domain);
		let pointsAtUs = false;
		try {
			// Node 18+ has a DNS promises API; confirm the domain resolves to our box.
			const { resolve4 } = await import('node:dns/promises');
			const ips = await resolve4(domain).catch(() => [] as string[]);
			pointsAtUs = ips.includes(KAZWIRE_SERVER_IP);
		} catch {
			pointsAtUs = false;
		}
		return json({ domain, registered, pointsAtUs, live: registered && pointsAtUs });
	}
	return json({ count: countDomains(), serverIp: KAZWIRE_SERVER_IP });
};

/** POST /api/domains { domain }  -> register a community mirror. */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request.' }, { status: 400 });
	}
	const raw = (body as { domain?: unknown })?.domain;

	const { domain, error } = normalizeDomain(raw);
	if (!domain) return json({ error }, { status: 400 });

	const ip = getRealIp(request, getClientAddress);
	const rl = rateLimit(ip);
	if (!rl.ok) {
		return json(
			{ error: 'You’ve added a lot of domains — take a break and try again later.' },
			{ status: 429, headers: rl.retryAfterSec ? { 'Retry-After': String(rl.retryAfterSec) } : {} }
		);
	}

	const result = addDomain(domain, ip);
	const code = result.ok ? (result.status === 'added' ? 201 : 200) : result.status === 'full' ? 507 : 500;
	return json(
		{ ok: result.ok, status: result.status, domain: result.domain, message: result.message, serverIp: KAZWIRE_SERVER_IP },
		{ status: code }
	);
};
