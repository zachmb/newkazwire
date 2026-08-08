import { games } from '$lib/data/games';
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const prerender = false;

export const load = (async ({ params }) => {
	const slug: string = params.id;
	const game = games.find(g => g.href === `/g/${slug}`);

	if (!game) {
		throw error(404, 'Game not found');
	}

	return {
		game: { ...game, emulatorType: 'ruffle', id: slug }
	};
}) satisfies PageLoad;
