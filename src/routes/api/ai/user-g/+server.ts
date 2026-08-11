import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToOCI, addToRegistry, getRegistry, checkStorageLimits } from '$lib/server/oci';
import type { UserGame } from '$lib/server/oci';
import { getRealIp, geolocate } from '$lib/server/ip';

function cleanName(raw: unknown): string {
    const s = (typeof raw === 'string' ? raw : '').replace(/[<>]/g, '').trim().slice(0, 32);
    return s || 'Anonymous';
}

export const POST: RequestHandler = async ({ request, getClientAddress, url }) => {
    try {
        const { title, description, code, sourceGameId, creatorName, cover } = await request.json();

        if (!title || !code) {
            return json({ error: 'Title and code are required' }, { status: 400 });
        }

        // Real visitor IP (behind nginx, getClientAddress() is 127.0.0.1 — read XFF).
        const ip = getRealIp(request, getClientAddress);

        // Measure the game file size in bytes (UTF-8)
        const sizeBytes = new TextEncoder().encode(code).length;

        // Fetch registry once and check both storage limits before any upload
        const registry = await getRegistry();
        checkStorageLimits(sizeBytes, registry); // throws if over limit

        const id = crypto.randomUUID();
        const codePath = `user-games/${id}.html`;

        // Upload HTML code to OCI
        const codeUrl = await uploadToOCI(codePath, code, 'text/html');

        // Coarse creator location for public attribution (best-effort; "" on failure).
        const creatorLocation = await geolocate(ip);

        // Cover snapshot: the client captures the game's first canvas frame as a PNG
        // data URL and sends it here. Upload it as the gallery cover (best-effort — a
        // missing/malformed cover just falls back to the default art in the UI).
        let coverUrl: string | undefined;
        try {
            if (typeof cover === 'string' && cover.startsWith('data:image/')) {
                const comma = cover.indexOf(',');
                const b64 = cover.slice(comma + 1);
                const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                if (bytes.length > 0 && bytes.length <= 2 * 1024 * 1024) {
                    const mime = cover.slice(5, comma).split(';')[0] || 'image/png';
                    const ext = mime.includes('jpeg') ? 'jpg' : 'png';
                    coverUrl = await uploadToOCI(`user-games/${id}.${ext}`, new Blob([bytes], { type: mime }), mime);
                }
            }
        } catch {
            coverUrl = undefined; // never fail a publish over a cover
        }

        // Add to registry with size tracked
        const newGame: UserGame = {
            id,
            title,
            description: description || '',
            codeUrl,
            creatorIp: ip,
            creatorName: cleanName(creatorName),
            creatorLocation,
            coverUrl,
            createdAt: new Date().toISOString(),
            sourceGameId,
            avgRating: 0,
            sizeBytes
        };

        await addToRegistry(newGame);

        const publicPath = `/ai/user-g/${id}`;
        const publicUrl = new URL(publicPath, url.origin).toString();
        const sizeKB = (sizeBytes / 1024).toFixed(1);
        return json({ success: true, gameId: id, publicPath, publicUrl, sizeKB });
    } catch (error: any) {
        console.error('Failed to upload game:', error);
        return json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
};
