// Deterministic cover art for AI games that have no canvas snapshot. Pure SVG —
// free, instant, and SAFE on arbitrary user titles (no image model). Flat, on-brand
// (Kazwire amber/steel-blue family), seeded by the game id/title so each game gets a
// distinct-but-stable cover. Used as the gallery fallback so NO game is ever blank.

function hash(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function escapeXml(s: string): string {
	return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Dark, flat backgrounds + a bright on-brand accent. No gradients.
const BG = ['#111827', '#1e293b', '#7c2d12', '#0f3d3a', '#3b1d5e', '#1e3a8a', '#7c1d3a', '#334155'];
const FG = ['#f59e0b', '#38bdf8', '#fb923c', '#2dd4bf', '#c084fc', '#60a5fa', '#fb7185', '#e2e8f0'];

/** First grapheme of the title as the cover glyph — an emoji if it leads with one,
 *  else the first letter uppercased. */
function glyphOf(title: string): string {
	const t = title.trim();
	if (!t) return '🎮';
	const first = [...t][0];
	return /[a-z0-9]/i.test(first) ? first.toUpperCase() : first;
}

/** A 16:9 SVG cover string for a game. */
export function coverSvg(title: string, seed: string): string {
	const h = hash(seed || title || 'kazwire');
	const bg = BG[h % BG.length];
	const fg = FG[(h >> 3) % FG.length];
	const glyph = escapeXml(glyphOf(title));
	const label = escapeXml((title || 'AI Game').trim().slice(0, 40));
	// A few seeded flat shapes for texture (low opacity, no gradient).
	const cx = 60 + (h % 360);
	const cy = 40 + ((h >> 5) % 120);
	const r = 60 + ((h >> 9) % 90);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270" role="img" aria-label="${label}">
  <rect width="480" height="270" fill="${bg}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fg}" opacity="0.14"/>
  <rect x="${(h >> 2) % 380}" y="${150 + ((h >> 7) % 60)}" width="120" height="120" fill="${fg}" opacity="0.10" transform="rotate(18 240 135)"/>
  <text x="50%" y="46%" text-anchor="middle" dominant-baseline="central" font-family="Inter, system-ui, sans-serif" font-size="120" font-weight="800" fill="${fg}">${glyph}</text>
  <rect x="0" y="210" width="480" height="60" fill="#000000" opacity="0.45"/>
  <text x="20" y="246" font-family="Inter, system-ui, sans-serif" font-size="24" font-weight="800" fill="#ffffff">${label}</text>
</svg>`;
}
