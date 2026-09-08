/**
 * Community mirror registry.
 *
 * Kids can add their own domain from /portal — they point its DNS A record at the
 * Kazwire box (51.81.210.201) and register it here. Every registered domain is then
 * served by the same app (nginx/Caddy is a catch-all), and Caddy's on-demand TLS
 * asks /api/domains/verify before issuing a cert — so ONLY domains that were
 * registered here (and are actually pointed at us) ever get a certificate. That
 * `ask` gate is what stops the on-demand-TLS endpoint from being abused into
 * unlimited Let's Encrypt requests.
 *
 * Storage is a flat JSON file (Kazwire has no DB). It lives under KAZWIRE_DATA_DIR
 * (default /opt/kazwire/data) so it survives redeploys; in dev it falls back to a
 * gitignored .data/ in the repo.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const KAZWIRE_SERVER_IP = '51.81.210.201';

/** Domains we own/operate — always served, never treated as user submissions. */
export const BASE_DOMAINS = new Set([
	'kazwire.com',
	'wirekaz.com',
	'kazport.com',
	'67diddy.com',
	'67party.com',
	'homeworkisfun.com',
	'studentguidehub.com',
	'contrapasso.org',
	'reformgbn.org',
	'pike.so',
	'askdrhoffman.org',
	'fatimahsguide.com',
	'pratikvangal.com'
]);

/** Soft ceiling so the registry can't grow without bound (and to stay well within
 * Let's Encrypt issuance limits). Bump if the mirror network genuinely outgrows it. */
const MAX_DOMAINS = 5000;

export interface MirrorDomain {
	domain: string;
	addedAt: number;
	addedByIp?: string;
}

const DATA_DIR = process.env.KAZWIRE_DATA_DIR || (process.env.NODE_ENV === 'production' ? '/opt/kazwire/data' : join(process.cwd(), '.data'));
const FILE = join(DATA_DIR, 'custom-domains.json');

let cache: Map<string, MirrorDomain> | null = null;

function load(): Map<string, MirrorDomain> {
	if (cache) return cache;
	cache = new Map();
	try {
		if (existsSync(FILE)) {
			const raw = JSON.parse(readFileSync(FILE, 'utf8')) as MirrorDomain[];
			for (const d of raw) if (d?.domain) cache.set(d.domain, d);
		}
	} catch (err) {
		console.error('[domains] failed to read registry:', err);
	}
	return cache;
}

function persist(map: Map<string, MirrorDomain>) {
	try {
		if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
		writeFileSync(FILE, JSON.stringify([...map.values()], null, 2));
	} catch (err) {
		console.error('[domains] failed to write registry:', err);
		throw err;
	}
}

/**
 * Normalize + strictly validate a submitted hostname. Accepts things a kid might
 * paste ("https://Foo.COM/", " foo.com ") and returns the bare lowercased FQDN, or
 * an error the UI can show.
 */
export function normalizeDomain(raw: unknown): { domain?: string; error?: string } {
	if (typeof raw !== 'string') return { error: 'Enter a domain.' };
	let d = raw.trim().toLowerCase();
	if (!d) return { error: 'Enter a domain.' };

	// Strip scheme, any path/query/port, leading www. isn't stripped (they may want
	// the apex; www is a separate label they can add too), trailing dot.
	d = d.replace(/^[a-z]+:\/\//, '').replace(/[/?#].*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');

	if (d.length < 4 || d.length > 253) return { error: 'That doesn’t look like a valid domain.' };
	if (!d.includes('.')) return { error: 'Include the full domain, like myschoolgames.com.' };
	if (/^[\d.]+$/.test(d)) return { error: 'Enter a domain name, not an IP address.' };

	// RFC-ish: labels 1–63 chars, letters/digits/hyphens, no leading/trailing hyphen;
	// TLD must be ≥2 letters. Rejects spaces, underscores, unicode (submit punycode).
	const labelRe = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
	const labels = d.split('.');
	if (labels.length < 2) return { error: 'That doesn’t look like a valid domain.' };
	for (const l of labels) if (!labelRe.test(l)) return { error: 'That doesn’t look like a valid domain.' };
	const tld = labels[labels.length - 1];
	if (!/^[a-z]{2,}$/.test(tld)) return { error: 'That doesn’t look like a valid domain.' };

	return { domain: d };
}

/** True for our own domains OR anything already ending in one of them (a subdomain
 * of a Kazwire domain is served automatically — no need to register it). */
export function isOwnedDomain(domain: string): boolean {
	if (BASE_DOMAINS.has(domain)) return true;
	for (const base of BASE_DOMAINS) if (domain.endsWith('.' + base)) return true;
	return false;
}

/** Is this hostname allowed to be served / get a cert? (used by the Caddy ask gate) */
export function isServable(domain: string): boolean {
	if (isOwnedDomain(domain)) return true;
	const reg = load();
	if (reg.has(domain)) return true;
	// Allow subdomains of any registered community domain too (e.g. www.theirdomain.com),
	// so a cert is issued for the www record we tell users to add.
	const parts = domain.split('.');
	for (let i = 1; i < parts.length - 1; i++) {
		if (reg.has(parts.slice(i).join('.'))) return true;
	}
	return false;
}

// Subdomains we advertise as usable links. For our OWN domains we control the DNS
// (these all resolve); for community domains we only promise apex + www (what users
// are told to add). Deliberately excludes fingerprint-y names.
const OWNED_LINK_SUBS = ['', 'www', 'play', 'games', 'go', 'unblocked', 'hub', 'new'];
const COMMUNITY_LINK_SUBS = ['', 'www'];

/** All live bare domains (our own + community-registered), deduped + sorted. */
export function listLiveDomains(): string[] {
	const set = new Set<string>(BASE_DOMAINS);
	for (const d of load().keys()) set.add(d);
	return [...set].sort();
}

/** Full https:// URLs across all live domains — the pool the Discord bot hands out. */
export function listLinks(): string[] {
	const urls: string[] = [];
	for (const d of listLiveDomains()) {
		const subs = BASE_DOMAINS.has(d) ? OWNED_LINK_SUBS : COMMUNITY_LINK_SUBS;
		for (const s of subs) urls.push(`https://${s ? s + '.' : ''}${d}`);
	}
	return urls;
}

export function listDomains(): MirrorDomain[] {
	return [...load().values()].sort((a, b) => b.addedAt - a.addedAt);
}

export function countDomains(): number {
	return load().size;
}

export interface AddResult {
	ok: boolean;
	status: 'added' | 'exists' | 'owned' | 'full' | 'error';
	message: string;
	domain?: string;
}

/** Add a validated, normalized domain to the registry (idempotent). */
export function addDomain(domain: string, ip?: string, now = Date.now()): AddResult {
	if (isOwnedDomain(domain)) {
		return { ok: true, status: 'owned', domain, message: 'That domain (or its parent) is already hosted by Kazwire.' };
	}
	const map = load();
	if (map.has(domain)) {
		return { ok: true, status: 'exists', domain, message: 'Already on the list — just point its DNS at us and it goes live.' };
	}
	if (map.size >= MAX_DOMAINS) {
		return { ok: false, status: 'full', message: 'The mirror list is full right now. Try again later.' };
	}
	map.set(domain, { domain, addedAt: now, addedByIp: ip });
	try {
		persist(map);
	} catch {
		map.delete(domain);
		return { ok: false, status: 'error', message: 'Couldn’t save that right now. Try again in a bit.' };
	}
	return { ok: true, status: 'added', domain, message: 'Added! Point its DNS at us and it’ll be live in a minute.' };
}

// ---- simple per-IP rate limiter (in-memory; single-node is fine) ---------------

const HITS = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 10; // 10 new domains / IP / hour

export function rateLimit(ip: string, now = Date.now()): { ok: boolean; retryAfterSec?: number } {
	if (!ip) return { ok: true };
	const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
	if (arr.length >= MAX_PER_WINDOW) {
		const retryAfterSec = Math.ceil((WINDOW_MS - (now - arr[0])) / 1000);
		HITS.set(ip, arr);
		return { ok: false, retryAfterSec };
	}
	arr.push(now);
	HITS.set(ip, arr);
	return { ok: true };
}

/** Reset in-memory state — test helper only. */
export function __resetRateLimit() {
	HITS.clear();
}
