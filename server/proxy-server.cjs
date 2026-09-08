/**
 * Kazwire proxy transport server (Wisp + legacy bare fallback), single process.
 *
 * Ultraviolet 3.x on the client talks to a Wisp server (raw multiplexed TCP over
 * ONE WebSocket) via bare-mux + epoxy-transport. This process runs that Wisp
 * server on the cloaked path `/w/`. The old @tomphttp bare-server is kept as a
 * dormant fallback on `/bare/` (UV 3.x no longer uses it, but keeping it routed
 * means an old cached client can't hard-crash the process).
 *
 * The edge (nginx/Caddy) reverse-proxies the cloaked wisp path (WebSocket upgrade)
 * and, for rollback, `/bare/` to 127.0.0.1:8080.
 *
 * Cloaked paths (must match static/uv/uv.config.js + the edge config):
 *   Wisp WebSocket endpoint .. /w/
 *   Legacy bare (fallback) ... /bare/
 *
 * Crash hardening: modern streaming/anti-bot sites reset sockets constantly. An
 * unhandled 'error' on a socket exits Node — so we attach 'error' handlers to
 * every request/upgrade socket, and keep a last-resort uncaughtException logger
 * that does NOT exit.
 */
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { server: wisp, logging } = require('@mercuryworkshop/wisp-js/server');

// The cloaked wisp path. Kept as a prefix match so both `/w/` and `/w/<anything>`
// route (epoxy connects to `wss://host/w/`).
const WISP_PATH = process.env.WISP_PATH || '/w/';

// Legacy bare relay — dormant fallback only. Behind a reverse proxy every socket
// IP is 127.0.0.1, so the default per-IP keep-alive cap (10) is exhausted almost
// instantly → CONNECTION_LIMIT_EXCEEDED. Per-IP limiting is meaningless behind a
// reverse proxy, so raise it effectively to unlimited.
const bare = createBareServer('/bare/', {
	connectionLimiter: {
		maxConnectionsPerIP: 1000000,
		windowDuration: 60,
		blockDuration: 1
	}
});

const port = Number(process.env.BARE_PORT) || 8080;
const host = process.env.BARE_HOST || '127.0.0.1';

// Wisp server hardening options. `parse_real_ip` reads X-Forwarded-For from the
// reverse proxy (default trusts 127.0.0.1). Block obvious SSRF into the box.
wisp.options.allow_private_ips = false;
wisp.options.allow_loopback_ips = false;
if (process.env.WISP_LOG_LEVEL && logging && logging.set_level) {
	logging.set_level(logging[process.env.WISP_LOG_LEVEL] || logging.INFO);
}

function isWispRequest(req) {
	// Match the cloaked wisp path as a prefix (epoxy appends nothing, but be lenient).
	const url = req.url || '';
	return url === WISP_PATH || url.startsWith(WISP_PATH);
}

const server = http.createServer((req, res) => {
	// Guard the request socket so a mid-request reset can't throw.
	if (req.socket && !req.socket.__kzErrorHooked) {
		req.socket.__kzErrorHooked = true;
		req.socket.on('error', (err) => {
			console.warn('[kazwire] request socket error:', err && err.message);
		});
	}
	res.on('error', (err) => {
		console.warn('[kazwire] response error:', err && err.message);
	});

	try {
		if (bare.shouldRoute(req)) {
			bare.routeRequest(req, res);
			return;
		}
	} catch (err) {
		console.warn('[kazwire] bare routeRequest error:', err && err.message);
	}
	res.writeHead(404, { 'Content-Type': 'text/plain' });
	res.end('Not found');
});

server.on('upgrade', (req, socket, head) => {
	// A WebSocket that resets mid-stream (very common on IG/YouTube) must not
	// throw an unhandled 'error' — that would exit the whole process.
	socket.on('error', (err) => {
		console.warn('[kazwire] upgrade socket error:', err && err.message);
	});

	try {
		if (isWispRequest(req)) {
			wisp.routeRequest(req, socket, head);
			return;
		}
		if (bare.shouldRoute(req)) {
			bare.routeUpgrade(req, socket, head);
			return;
		}
	} catch (err) {
		console.warn('[kazwire] upgrade routing error:', err && err.message);
	}
	try {
		socket.end();
	} catch (_) {
		/* already gone */
	}
});

server.on('clientError', (err, socket) => {
	console.warn('[kazwire] clientError:', err && err.message);
	try {
		if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
	} catch (_) {
		/* ignore */
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
	console.log(
		`[kazwire] proxy-server listening on http://${host}:${port} — wisp ${WISP_PATH} (+ legacy bare /bare/ fallback)`
	);
});
