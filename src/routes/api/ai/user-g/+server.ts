import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToOCI, addToRegistry, getRegistry, checkStorageLimits, upsertProfile } from '$lib/server/oci';
import type { UserGame } from '$lib/server/oci';
import { getRealIp, geolocate } from '$lib/server/ip';
import { stripMarkdown } from '$lib/server/deepseek';

function cleanName(raw: unknown): string {
    const s = (typeof raw === 'string' ? raw : '').replace(/[<>]/g, '').trim().slice(0, 32);
    return s || 'Anonymous';
}

export const POST: RequestHandler = async ({ request, getClientAddress, url }) => {
    try {
        const { title, description, code: rawCode, sourceGameId, creatorName, cover, creatorUid, source } =
            await request.json();

        if (!rawCode) {
            return json({ error: 'Code is required' }, { status: 400 });
        }

        // The streamed generation path assembles code client-side, so stray ```
        // markdown fences from the model can reach publish — they break the game
        // (black screen). Strip them server-side no matter which path sent this.
        const code = stripMarkdown(String(rawCode));
        if (!code) {
            return json({ error: 'Code is required' }, { status: 400 });
        }

        // Every game gets a title: the player's, else the name the AI gave it in its
        // own <title>, else a generic fallback. Never blank in the gallery.
        let safeTitle = (typeof title === 'string' ? title : '').trim();
        if (!safeTitle) {
            const m = String(code).match(/<title>\s*([^<]{1,60}?)\s*<\/title>/i);
            const aiTitle = m && m[1].trim();
            safeTitle = aiTitle && !/^(document|untitled|game)$/i.test(aiTitle) ? aiTitle : 'Untitled Game';
        }
        safeTitle = safeTitle.slice(0, 80);

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
        const cleanCreator = cleanName(creatorName);
        const newGame: UserGame = {
            id,
            title: safeTitle,
            description: description || '',
            codeUrl,
            creatorIp: ip,
            creatorName: cleanCreator,
            creatorLocation,
            coverUrl,
            createdAt: new Date().toISOString(),
            sourceGameId,
            avgRating: 0,
            sizeBytes,
            creatorUid: typeof creatorUid === 'string' ? creatorUid : undefined,
            source: source === 'upload' ? 'upload' : 'ai',
            regenCount: 0
        };

        await addToRegistry(newGame);

        // Best-effort: attribute this creation to the player's public profile.
        if (typeof creatorUid === 'string' && creatorUid) {
            try {
                await upsertProfile(creatorUid, cleanCreator, creatorLocation || undefined, {
                    gamesCreated: 1
                });
            } catch {
                /* non-fatal */
            }
        }

        const publicPath = `/ai/user-g/${id}`;
        const publicUrl = new URL(publicPath, url.origin).toString();
        const sizeKB = (sizeBytes / 1024).toFixed(1);
        return json({ success: true, gameId: id, publicPath, publicUrl, sizeKB });
    } catch (error: any) {
        console.error('Failed to upload game:', error);
        return json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
};
