/**
 * Self-hosted Ultraviolet bare-server for Kazwire.
 * Runs as its own process; nginx reverse-proxies `/bare/` (and its websocket
 * upgrades) to this port. UV is pointed at `/bare/` in static/uv/uv.config.js.
 */
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');

// NOTE: behind nginx every request's socket IP is 127.0.0.1, so the default
// per-IP keep-alive cap (10) is exhausted almost instantly and users get
// CONNECTION_LIMIT_EXCEEDED. Per-IP limiting is meaningless behind a reverse
// proxy, so raise it effectively to unlimited.
const bare = createBareServer('/bare/', {
	connectionLimiter: {
		maxConnectionsPerIP: 1000000,
		windowDuration: 60,
		blockDuration: 1
	}
});
const port = Number(process.env.BARE_PORT) || 8080;
const host = process.env.BARE_HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
	// Guard the request socket: a mid-request reset must not throw an unhandled
	// 'error' (which would exit Node). ECONNRESET is routine on heavy sites.
	if (req.socket && !req.socket.__kzErrorHooked) {
		req.socket.__kzErrorHooked = true;
		req.socket.on('error', (err) => console.warn('[kazwire] request socket error:', err && err.message));
	}
	res.on('error', (err) => console.warn('[kazwire] response error:', err && err.message));
	try {
		if (bare.shouldRoute(req)) {
			bare.routeRequest(req, res);
			return;
		}
	} catch (err) {
		console.warn('[kazwire] routeRequest error:', err && err.message);
	}
	res.writeHead(404, { 'Content-Type': 'text/plain' });
	res.end('Not found');
});

server.on('upgrade', (req, socket, head) => {
	socket.on('error', (err) => console.warn('[kazwire] upgrade socket error:', err && err.message));
	try {
		if (bare.shouldRoute(req)) {
			bare.routeUpgrade(req, socket, head);
			return;
		}
	} catch (err) {
		console.warn('[kazwire] routeUpgrade error:', err && err.message);
	}
	try {
		socket.end();
	} catch (_) {
		/* already gone */
	}
});

// Last-resort net: never let a stray socket reset kill the process.
process.on('uncaughtException', (err) => {
	console.error('[kazwire] uncaughtException (ignored, not exiting):', err && err.stack);
});
process.on('unhandledRejection', (reason) => {
	console.error('[kazwire] unhandledRejection (ignored):', reason);
});

server.listen(port, host, () => {
	console.log(`[kazwire] bare-server listening on http://${host}:${port}/bare/`);
});
