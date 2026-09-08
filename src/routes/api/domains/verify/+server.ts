import { text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isServable, normalizeDomain } from '$lib/server/domains';

/**
 * Caddy on-demand-TLS `ask` gate.
 *
 * Caddy calls  GET /api/domains/verify?domain=<sni>  during the TLS handshake for
 * any domain it doesn't already have a cert for. Return 200 to let Caddy obtain a
 * Let's Encrypt cert, non-200 to refuse. We approve ONLY domains we own or that a
 * user registered via /portal — this is the guard that keeps the on-demand endpoint
 * from being turned into an unlimited cert-request machine.
 *
 * (By the time Caddy reaches this handshake the domain already resolves to our IP —
 * otherwise the connection wouldn't have landed here — so the registry check is the
 * meaningful authorization.)
 */
export const GET: RequestHandler = ({ url }) => {
	const { domain } = normalizeDomain(url.searchParams.get('domain'));
	if (domain && isServable(domain)) return text('ok', { status: 200 });
	return text('not allowed', { status: 403 });
};
