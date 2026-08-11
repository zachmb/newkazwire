import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { games } from '$lib/data/games';

export const load: PageLoad = async ({ params }) => {
	const slug = params['id'];

	// Try to find static games data
	const game = games.find((g) => g.href === `/g/${slug}`);

	if (!game) {
		return {
			game: {
				id: slug,
				slug: slug,
				name: slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
				developer: 'Unknown Developer',
				image: '/logo.png', // Fallback
				description: 'Game description not found.',
				top_color: '#000000',
				tags: ['Arcade'],
				views: 0,
				rating: 0,
				embedURL: null,
				emulatorType: null
			} as any
		};
	}

	const play = (game as any).play as string | undefined;

	return {
		game: {
			id: slug,
			slug: slug,
			name: game.title,
			developer: '',
			image: game.image,
			description: game.description || 'No description available.',
			top_color: '#000000',
			tags: game.tags || [],
			views: 1000,
			rating: 5,
			// Play type from game metadata: 'ruffle' -> Flash SWF via /g/ruffle/[id];
			// 'embed' -> external site proxied through Ultraviolet; else static HTML.
			embedURL: play === 'embed' ? (game as any).src : null,
			emulatorType: play === 'ruffle' ? 'ruffle' : play === 'emulator' ? 'emulatorjs' : null
		} as any
	};
};
