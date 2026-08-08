import { error } from '@sveltejs/kit';
import { blogs } from '$lib/data/blogs';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    const blog = blogs.find(b => b.slug === params.slug);

    if (!blog) {
        throw error(404, 'Blog post not found');
    }

    return {
        blog
    };
};
