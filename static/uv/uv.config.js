// Simple XOR codec implementation (no dependency on the Ultraviolet object so
// this config is safe to evaluate before uv.bundle.js has loaded). Encode and
// decode are symmetric and MUST match Ultraviolet.codec.xor exactly, otherwise
// the service worker (which uses the bundle's codec) and the page (which uses
// this config's codec) disagree and proxied pages fail to load.
const xorEncode = (str) => {
	if (!str) return str;
	return encodeURIComponent(
		str
			.split('')
			.map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
			.join('')
	);
};

// Symmetric inverse of xorEncode. The previous implementation split on '?' and
// re-joined, which corrupted every URL that carried a query string (e.g. any
// Google/DuckDuckGo search or a YouTube watch URL) because the XOR had already
// been applied across the '?' — that mismatch is a classic cause of proxied
// pages erroring out. Applying the same XOR over the whole decoded string
// round-trips correctly.
const xorDecode = (str) => {
	if (!str) return str;
	return decodeURIComponent(str)
		.split('')
		.map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
		.join('');
};

self.__uv$config = {
	prefix: '/service/',
	bare: '/bare/',
	encodeUrl: xorEncode,
	decodeUrl: xorDecode,
	handler: '/uv/uv.handler.js',
	client: '/uv/uv.client.js',
	bundle: '/uv/uv.bundle.js',
	config: '/uv/uv.config.js',
	sw: '/uv/uv.sw.js'
};
