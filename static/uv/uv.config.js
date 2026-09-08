// ─── Cloaked path map (keep ALL of these in sync) ────────────────────────────
//   route (UI page) ........ /study            (was /proxy — never say "proxy")
//   UV service-worker scope . /edu/            (this file's `prefix`; was /service/)
//   Wisp websocket endpoint . /w/              (backend wisp server; replaces /bare/)
// The SW scope (registration in the page), this `prefix`, the nginx/Caddy config,
// and the client's setTransport({ wisp }) URL must ALL agree. Nothing here reads
// "proxy"/"bare"/"service" so a network filter or curious admin sees only generic,
// school-safe path segments in the HTML and in DevTools.
//
// Transport: Ultraviolet 3.x runs over bare-mux → epoxy-transport → Wisp (raw
// multiplexed TCP over ONE WebSocket to /w/). The old @tomphttp `/bare/` relay is
// gone; UV 3.x talks to the transport the page selects via BareMux before the SW
// is registered. There is NO `bare:` key in this config anymore — that is correct.
//
// ─── Custom XOR codec (kept dependency-free) ─────────────────────────────────
// This is an EXACT re-implementation of Ultraviolet.codec.xor.encode/decode so the
// config can evaluate before uv.bundle.js loads, and so both the page and the
// service worker use the SAME codec byte-for-byte.
//
// The critical detail is decode()'s split on '?': UV appends real query strings
// AFTER the encoded segment (e.g. a GET form submit, or Google/OAuth redirects add
// ?params to a proxied URL). Only the part BEFORE '?' is XOR-encoded; the query must
// be passed through untouched. A build that dropped this split and XOR'd the whole
// string garbled the query on every URL that carried one — exactly the
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
	prefix: '/edu/',
	encodeUrl: xorEncode,
	decodeUrl: xorDecode,
	handler: '/uv/uv.handler.js',
	client: '/uv/uv.client.js',
	bundle: '/uv/uv.bundle.js',
	config: '/uv/uv.config.js',
	sw: '/uv/uv.sw.js'
};
