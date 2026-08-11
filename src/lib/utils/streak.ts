/**
 * Client-side helpers for the account-free daily play streak.
 *
 * A visitor is identified by a random uid in localStorage (`kazwire_uid`) plus an
 * optional display name (`kazwire_player_name`). Nothing here touches cookies or
 * accounts — it's a lightweight, per-browser identity used only for the streak +
 * leaderboard.
 *
 * SSR-safe: every function that touches `window`/`localStorage` guards on
 * `typeof window` so importing this module never breaks on the server.
 */

import { browser } from '$app/environment';

const UID_KEY = 'kazwire_uid';
const NAME_KEY = 'kazwire_player_name';
const PING_SESSION_KEY = 'kazwire_streak_pinged'; // sessionStorage guard

export interface MyStreak {
	streak: number;
	longest: number;
	gamesPlayed: number;
	lastPlayedDate: string | null;
}

/** Returns the visitor's stable uid, generating + persisting one on first call. */
export function getUid(): string {
	if (!browser) return '';
	try {
		let uid = localStorage.getItem(UID_KEY);
		if (!uid) {
			uid =
				typeof crypto !== 'undefined' && crypto.randomUUID
					? crypto.randomUUID()
					: `kz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
			localStorage.setItem(UID_KEY, uid);
		}
		return uid;
	} catch {
		return '';
	}
}

/** Returns the visitor's chosen display name, or 'Anonymous' if none set. */
export function getPlayerName(): string {
	if (!browser) return 'Anonymous';
	try {
		return localStorage.getItem(NAME_KEY) || 'Anonymous';
	} catch {
		return 'Anonymous';
	}
}

/** True only if the visitor has actually chosen a display name (for name-gating). */
export function hasPlayerName(): boolean {
	if (!browser) return false;
	try {
		return !!localStorage.getItem(NAME_KEY);
	} catch {
		return false;
	}
}

/** Persists a display name (trimmed + bounded). Empty clears back to Anonymous. */
export function setPlayerName(name: string): void {
	if (!browser) return;
	try {
		const clean = (name || '').trim().slice(0, 24);
		if (clean) localStorage.setItem(NAME_KEY, clean);
		else localStorage.removeItem(NAME_KEY);
	} catch {
		/* ignore quota/private-mode errors */
	}
}

/**
 * Records a daily play. Safe to call on every game load — it's guarded to fire at
 * most once per browser session (sessionStorage), so navigating between games
 * won't spam the endpoint. Pass `{ force: true }` to bypass the guard.
 *
 * Returns the updated streak, or null if it couldn't record (offline/SSR).
 */
export async function pingStreak(opts: { force?: boolean } = {}): Promise<MyStreak | null> {
	if (!browser) return null;

	if (!opts.force) {
		try {
			if (sessionStorage.getItem(PING_SESSION_KEY)) return getMyStreak();
		} catch {
			/* sessionStorage unavailable — just proceed to ping */
		}
	}

	const uid = getUid();
	if (!uid) return null;

	try {
		const res = await fetch('/api/streak', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ uid, name: getPlayerName() })
		});
		if (!res.ok) return null;
		const data = await res.json();
		if (!data?.success) return null;

		try {
			sessionStorage.setItem(PING_SESSION_KEY, '1');
		} catch {
			/* ignore */
		}

		return {
			streak: data.streak ?? 0,
			longest: data.longest ?? 0,
			gamesPlayed: data.gamesPlayed ?? 0,
			lastPlayedDate: data.lastPlayedDate ?? null
		};
	} catch {
		return null;
	}
}

/** Fetches the current visitor's streak without recording a play. */
export async function getMyStreak(): Promise<MyStreak | null> {
	if (!browser) return null;
	const uid = getUid();
	if (!uid) return null;

	try {
		const res = await fetch(`/api/streak?uid=${encodeURIComponent(uid)}`);
		if (!res.ok) return null;
		const data = await res.json();
		if (!data?.success) return null;
		return {
			streak: data.streak ?? 0,
			longest: data.longest ?? 0,
			gamesPlayed: data.gamesPlayed ?? 0,
			lastPlayedDate: data.lastPlayedDate ?? null
		};
	} catch {
		return null;
	}
}
