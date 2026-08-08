/**
 * Self-hosted Ultraviolet bare-server for Kazwire.
 * Runs as its own process; nginx reverse-proxies `/bare/` (and its websocket
 * upgrades) to this port. UV is pointed at `/bare/` in static/uv/uv.config.js.
 */
const http = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');

const bare = createBareServer('/bare/');
const port = Number(process.env.BARE_PORT) || 8080;
const host = process.env.BARE_HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
	if (bare.shouldRoute(req)) {
		bare.routeRequest(req, res);
	} else {
		res.writeHead(404, { 'Content-Type': 'text/plain' });
		res.end('Not found');
	}
});

server.on('upgrade', (req, socket, head) => {
	if (bare.shouldRoute(req)) {
		bare.routeUpgrade(req, socket, head);
	} else {
		socket.end();
	}
});

server.listen(port, host, () => {
	console.log(`[kazwire] bare-server listening on http://${host}:${port}/bare/`);
});
