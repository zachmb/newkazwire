import { writable } from 'svelte/store';

export const isSearchOpen = writable(false);
export const searchQuery = writable('');
