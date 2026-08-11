import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { getAdminStats } from '$lib/server/oci';

/**
 * Password-gated server stats for the owner. The password lives in env
 * (ADMIN_PASSWORD) — NEVER in git. If it's unset, admin is disabled (fail-closed).
 */
export const POST: RequestHandler = async ({ request }) => {
    const { password } = (await request.json().catch(() => ({}))) as any;
    const expected = env.ADMIN_PASSWORD;
    if (!expected) return json({ error: 'Admin is not configured on this server.' }, { status: 503 });
    if (!password || password !== expected) return json({ error: 'Incorrect password.' }, { status: 401 });

    const stats = await getAdminStats();

    // Live party-server stats (best-effort).
    let party: any = null;
    try {
        const r = await fetch('http://127.0.0.1:8091/party/health');
        if (r.ok) party = await r.json();
    } catch {
        /* party server unreachable */
    }

    return json({ success: true, stats, party });
};
