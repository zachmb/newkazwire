import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface LocalAiGame {
    id: string;
    title: string;
    description: string;
    code: string;
    createdAt: string;
    prompt?: string;
}

const STORAGE_KEY = 'kazwire_local_ai_games';
const MAX_GAMES = 50;

function createLocalAiGamesStore() {
    const initialValue: LocalAiGame[] = browser
        ? (() => {
            try {
                return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            } catch {
                return [];
            }
        })()
        : [];

    const { subscribe, set, update } = writable<LocalAiGame[]>(initialValue);

    return {
        subscribe,

        saveGame: (game: Omit<LocalAiGame, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
            const entry: LocalAiGame = {
                id: game.id || crypto.randomUUID(),
                title: game.title,
                description: game.description || '',
                code: game.code,
                createdAt: game.createdAt || new Date().toISOString(),
                prompt: game.prompt
            };

            update((games) => {
                // Deduplicate by id
                const filtered = games.filter((g) => g.id !== entry.id);
                const updated = [entry, ...filtered].slice(0, MAX_GAMES);
                if (browser) {
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    } catch (e) {
                        console.warn('localStorage quota exceeded, trimming AI games');
                        // If storage fails, remove oldest games and try again
                        const trimmed = [entry, ...filtered].slice(0, 10);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
                        return trimmed;
                    }
                }
                return updated;
            });

            return entry.id;
        },

        deleteGame: (id: string) => {
            update((games) => {
                const updated = games.filter((g) => g.id !== id);
                if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                return updated;
            });
        },

        getGame: (id: string): LocalAiGame | undefined => {
            let found: LocalAiGame | undefined;
            subscribe((games) => {
                found = games.find((g) => g.id === id);
            })();
            return found;
        }
    };
}

export const localAiGames = createLocalAiGamesStore();
