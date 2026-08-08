import { games } from '$lib/data/games';
import { blogs } from '$lib/data/blogs';
import { config } from '$lib/config';

export const GET = async () => {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${config.branding.mainDomain}</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    ${games.map(game => `
    <url>
        <loc>${config.branding.mainDomain}${game.href}</loc>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`).join('')}
    ${blogs.map(blog => `
    <url>
        <loc>${config.branding.mainDomain}/blog/${blog.slug}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`).join('')}
</urlset>`;

    return new Response(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'max-age=0, s-maxage=3600'
        }
    });
};
