import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveTelemetry } from '$lib/server/oci';

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	try {
		const payload = await request.json();
		const ip = getClientAddress();
		const sessionId = payload.sessionId || 'unknown';

		// Enhance payload with server-side info
		const enhancedPayload = {
			...payload,
			ip,
			receivedAt: new Date().toISOString()
		};

		await saveTelemetry(sessionId, enhancedPayload);

		return json({ success: true });
	} catch (err: any) {
		console.error('[Telemetry API] Error saving telemetry:', err);
		// Return 200 anyway to prevent client retry loops for telemetry
		return json({ success: false, error: err.message }, { status: 200 });
	}
};
