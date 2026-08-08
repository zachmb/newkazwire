import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface RecentlyPlayedGame {
    id: string;
    timestamp: number;
}

const STORAGE_KEY = 'kazwire_recently_played';
const MAX_RECENT_GAMES = 20;

function createRecentlyPlayedStore() {
    // Initialize from localStorage if in browser
    const initialValue: RecentlyPlayedGame[] = browser
        ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        : [];

    const { subscribe, set, update } = writable<RecentlyPlayedGame[]>(initialValue);

    return {
        subscribe,
        addGame: (gameId: string) => {
            update((games) => {
                // Remove existing entry for this game if it exists
                const filtered = games.filter((g) => g.id !== gameId);

                // Add to front with current timestamp
                const updated = [{ id: gameId, timestamp: Date.now() }, ...filtered];

                // Keep only the most recent MAX_RECENT_GAMES
                const trimmed = updated.slice(0, MAX_RECENT_GAMES);

                // Save to localStorage
                if (browser) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
                }

                return trimmed;
            });
        },
        getRecentIds: (): string[] => {
            let ids: string[] = [];
            subscribe((games) => {
                ids = games.map((g) => g.id);
            })();
            return ids;
        }
    };
}

export const recentlyPlayed = createRecentlyPlayedStore();
