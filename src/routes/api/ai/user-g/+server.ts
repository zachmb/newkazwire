import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadToOCI, addToRegistry, getRegistry, checkStorageLimits } from '$lib/server/oci';
import type { UserGame } from '$lib/server/oci';

export const POST: RequestHandler = async ({ request, getClientAddress, url }) => {
    try {
        const { title, description, code, sourceGameId } = await request.json();

        if (!title || !code) {
            return json({ error: 'Title and code are required' }, { status: 400 });
        }

        const ip = getClientAddress();

        // Measure the game file size in bytes (UTF-8)
        const sizeBytes = new TextEncoder().encode(code).length;

        // Fetch registry once and check both storage limits before any upload
        const registry = await getRegistry();
        checkStorageLimits(sizeBytes, registry); // throws if over limit

        const id = crypto.randomUUID();
        const codePath = `user-games/${id}.html`;

        // Upload HTML code to OCI
        const codeUrl = await uploadToOCI(codePath, code, 'text/html');

        // Add to registry with size tracked
        const newGame: UserGame = {
            id,
            title,
            description: description || '',
            codeUrl,
            creatorIp: ip,
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
