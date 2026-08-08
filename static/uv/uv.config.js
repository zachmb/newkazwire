// Simple XOR codec implementation (no dependency on Ultraviolet object)
const xorEncode = (str) => {
	return encodeURIComponent(
		str
			.split('')
			.map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
			.join('')
	);
};

const xorDecode = (str) => {
	let [input, ...search] = decodeURIComponent(str).split('?');
	return (
		input
			.split('')
			.map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
			.join('') + (search.length ? '?' + search.join('?') : '')
	);
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
