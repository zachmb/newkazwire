/**
 * Lightweight server-side text moderation for user-generated content (posts,
 * comments, community notes, display names). Kazwire has no accounts/DB, so this
 * is a self-contained profanity/abuse censor — no external service, fail-safe.
 *
 * cleanText() trims, collapses whitespace, strips control chars, caps length, and
 * masks banned words (leetspeak/obfuscation-aware). It rejects outright if the
 * message is nothing but slurs/attacks. Mild words are masked, not rejected, so the
 * feed stays usable. Conservative and easy to extend.
 */

// Base list (kept compact; matched against a de-obfuscated form so variants are caught).
const BANNED = [
	'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'piss', 'bastard', 'slut', 'whore',
	'nigger', 'nigga', 'faggot', 'fag', 'retard', 'kike', 'spic', 'chink', 'tranny', 'coon',
	'rape', 'rapist', 'kys', 'nazi'
];

// Short tokens that must ONLY match as whole words (avoid the Scunthorpe problem).
const SHORT_WHOLE_WORD = new Set(['fag', 'kys', 'spic', 'coon', 'chink']);

// Hard slurs: if the WHOLE message (spaces/punct removed) contains any of these, block
// it outright — catches spaced-out evasion like "n i g g e r" that per-token masking misses.
const HARD_SLURS = ['nigger', 'nigga', 'faggot', 'kike', 'spic', 'chink', 'tranny', 'coon', 'kike'];

// Control chars to strip: U+0000–U+001F except tab (09) and newline (0A), plus DEL (7F).
// Built via RegExp() so the source file carries no literal control characters.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B-\\u001F\\u007F]', 'g');

/** Fold common leetspeak/obfuscation so "n1gg3r", "f u c k", "sh!t" are caught. */
function deobfuscate(s: string): string {
	return s
		.toLowerCase()
		.replace(/[@4]/g, 'a')
		.replace(/3/g, 'e')
		.replace(/[1!|]/g, 'i')
		.replace(/0/g, 'o')
		.replace(/[$5]/g, 's')
		.replace(/7/g, 't')
		.replace(/[^a-z]/g, ''); // drop spaces/punct so "f.u.c.k" collapses to "fuck"
}

function maskWord(word: string): string {
	if (word.length <= 2) return '*'.repeat(word.length);
	return word[0] + '*'.repeat(word.length - 1);
}

/**
 * Sanitizes and censors a block of user text.
 * Returns cleaned text (banned words masked) plus a `blocked` flag when the input is
 * empty after cleaning or is essentially all-toxic.
 */
export function cleanText(
	raw: unknown,
	opts: { maxLength?: number } = {}
): { text: string; blocked: boolean; reason?: string } {
	const maxLength = opts.maxLength ?? 500;
	if (typeof raw !== 'string') return { text: '', blocked: true, reason: 'empty' };

	// Strip control chars (keeps \t, \n and all emoji >= U+0080); collapse whitespace.
	const text = raw
		.replace(CONTROL_CHARS, '')
		.replace(/[^\S\n]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.slice(0, maxLength);

	if (!text) return { text: '', blocked: true, reason: 'empty' };

	// Mask banned words token-by-token (so we preserve the rest of the message).
	let bannedHits = 0;
	let tokenCount = 0;
	const cleaned = text
		.split(/(\s+)/)
		.map((tok) => {
			if (tok === '' || /^\s+$/.test(tok)) return tok;
			tokenCount++;
			const deob = deobfuscate(tok);
			for (const bad of BANNED) {
				const hit = SHORT_WHOLE_WORD.has(bad) ? deob === bad : deob.includes(bad);
				if (hit) {
					bannedHits++;
					return maskWord(tok);
				}
			}
			return tok;
		})
		.join('');

	// Whole-string slur check catches spaced-out evasion ("n i g g e r").
	const whole = deobfuscate(text);
	const hasHardSlur = HARD_SLURS.some((s) => whole.includes(s));

	// Reject if it's a hard slur, or essentially nothing but profanity.
	const blocked = hasHardSlur || (bannedHits > 0 && bannedHits >= tokenCount);
	return { text: cleaned, blocked, reason: blocked ? 'toxic' : undefined };
}

/** Clean a public display name: no control chars, bounded, non-empty fallback. */
export function cleanDisplayName(raw: unknown, fallback = 'Anonymous'): string {
	if (typeof raw !== 'string') return fallback;
	const { text, blocked } = cleanText(raw.replace(/[<>]/g, ''), { maxLength: 24 });
	if (blocked || !text) return fallback;
	return text;
}
