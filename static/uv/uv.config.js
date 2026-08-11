// EXACT re-implementation of Ultraviolet.codec.xor (kept dependency-free so this
// config evaluates before uv.bundle.js loads). encode()/decode() MUST match the
// bundle's codec byte-for-byte, since both the page and the service worker use these.
//
// The critical detail is decode()'s split on '?': UV appends real query strings
// AFTER the encoded segment (e.g. a GET form submit, or Google/OAuth redirects add
// ?params to a proxied URL). Only the part BEFORE '?' is XOR-encoded; the query must
// be passed through untouched. The previous build dropped this split and XOR'd the
// whole string, which garbled the query on every URL that carried one — exactly the
// "SyntaxError / Failed to load accounts.google.com/...?<garbage>" the sign-in flow hit.
const xorEncode = (str) => {
	if (!str) return str;
	let result = '';
	for (let i = 0; i < str.length; i++) {
		result += i % 2 ? String.fromCharCode(str.charCodeAt(i) ^ 2) : str[i];
	}
	return encodeURIComponent(result);
};

const xorDecode = (str) => {
	if (!str) return str;
	const [input, ...search] = str.split('?');
	let result = '';
	const decoded = decodeURIComponent(input);
	for (let i = 0; i < decoded.length; i++) {
		result += i % 2 ? String.fromCharCode(decoded.charCodeAt(i) ^ 2) : decoded[i];
	}
	return result + (search.length ? '?' + search.join('?') : '');
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
