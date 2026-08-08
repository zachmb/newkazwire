import { writable } from 'svelte/store';
import { browser } from '$app/environment';

interface UserProfile {
    username: string;
    joinDate: string;
    level: number;
    xp: number;
    gamesPlayed: number;
    favorites: number;       // Keep for stats display
    favoriteGames: string[]; // Store actual Game IDs
    coins: number;
    streak: number;
    lastDailyClaim: string | null; // ISO Date string
    inventory: string[];
    showAds: boolean; // New: Ad preference
}

const STORAGE_KEY = 'kazwire_user_profile';

const DEFAULT_PROFILE: UserProfile = {
    username: 'User',
    joinDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    level: 1,
    xp: 0,
    gamesPlayed: 0,
    favorites: 0,
    favoriteGames: [],
    coins: 0,
    streak: 0,
    lastDailyClaim: null,
    inventory: [],
    showAds: false // Default to false
};

function createUserProfileStore() {
    // Initialize from localStorage if in browser, otherwise use defaults
    const initialValue: UserProfile = browser
        ? JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_PROFILE))
        : DEFAULT_PROFILE;

    // Validation for new fields if loading old profile
    if (browser) {
        if (!initialValue.coins) {
            initialValue.coins = 0;
            initialValue.streak = 0;
            initialValue.lastDailyClaim = null;
            initialValue.inventory = [];
        }
        if (!initialValue.favoriteGames) {
            initialValue.favoriteGames = [];
        }
        if (initialValue.showAds === undefined) {
            initialValue.showAds = false;
        }
    }

    const { subscribe, set, update } = writable<UserProfile>(initialValue);

    // Save to localStorage whenever the store updates
    if (browser) {
        subscribe((val) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
        });
    }

    return {
        subscribe,
        set,
        update,
        updateUsername: (name: string) => update((n) => ({ ...n, username: name })),
        incrementGamesPlayed: () => update((n) => ({ ...n, gamesPlayed: (n.gamesPlayed || 0) + 1 })),
        addXP: (amount: number) =>
            update((n) => {
                const newXP = n.xp + amount;
                const newLevel = Math.floor(newXP / 100) + 1; // Simple level calculation
                return { ...n, xp: newXP, level: newLevel };
            }),
        toggleFavorite: (gameId: string) => {
            update((profile) => {
                if (!gameId) return profile;

                // Defensive: ensure favoriteGames is an array
                const currentFavorites = Array.isArray(profile.favoriteGames) ? profile.favoriteGames : [];
                const isFav = currentFavorites.includes(gameId);
                let newFavs = [...currentFavorites];

                if (isFav) {
                    newFavs = newFavs.filter(id => id !== gameId);
                } else {
                    newFavs.push(gameId);
                }

                return {
                    ...profile,
                    favoriteGames: newFavs,
                    favorites: newFavs.length
                };
            });
        },
        // Engagement features
        addCoins: (amount: number) => update((n) => ({ ...n, coins: n.coins + amount })),
        claimDailyReward: () => {
            update((profile) => {
                const today = new Date().toISOString().split('T')[0];
                const lastClaim = profile.lastDailyClaim ? profile.lastDailyClaim.split('T')[0] : null;

                if (lastClaim === today) return profile; // Already claimed

                let newStreak = profile.streak;
                // Check if yesterday was the last claim
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                if (lastClaim === yesterdayStr) {
                    newStreak++;
                } else {
                    newStreak = 1; // Reset or start fresh
                }

                // Base reward + multiplier
                const baseReward = 50;
                const multiplier = 1 + (newStreak * 0.1); // 10% bonus per streak day
                const reward = Math.floor(baseReward * multiplier);

                return {
                    ...profile,
                    coins: profile.coins + reward,
                    streak: newStreak,
                    lastDailyClaim: new Date().toISOString()
                };
            });
        },
        purchaseItem: (itemId: string, cost: number) => {
            update((profile) => {
                if (profile.coins >= cost && !profile.inventory.includes(itemId)) {
                    return {
                        ...profile,
                        coins: profile.coins - cost,
                        inventory: [...profile.inventory, itemId]
                    };
                }
                return profile;
            });
        },
        reset: () => {
            set(DEFAULT_PROFILE);
        }
    };
}

export const userProfile = createUserProfileStore();
