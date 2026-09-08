/*global UVServiceWorker,__uv$config*/
/*
 * Service worker registrar for Ultraviolet 3.x.
 * Registered by the /study page under the scope in uv.config.js (`/edu/`).
 * Imports the UV 3.x bundle + config + service-worker engine, then routes
 * matching requests through UV and passes everything else straight to the network.
 */
if ('undefined' === typeof window) {
	importScripts('/uv/uv.bundle.js');
	importScripts('/uv/uv.config.js');
	importScripts('/uv/uv.sw.js');

	const uv = new UVServiceWorker();

	async function handleRequest(event) {
		if (uv.route(event)) {
			return await uv.fetch(event);
		}
		return await fetch(event.request);
	}

	self.addEventListener('fetch', (event) => {
		event.respondWith(handleRequest(event));
	});
}
