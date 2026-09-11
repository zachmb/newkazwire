/**
 * Server-side text moderation for ALL user-generated content — community AI game
 * titles/prompts/descriptions, creator names, posts, comments, notes. Kazwire has
 * no accounts/DB, so this is a self-contained, fail-safe censor (no external
 * service). It is deliberately conservative for a school-audience games site.
 *
 * Two policies:
 *   - moderateStrict()  -> for TITLES, NAMES, PROMPTS: reject (blocked=true) on ANY
 *                          banned hit. Nothing suggestive should ever be published
 *                          or fed to the model. Callers substitute a safe fallback
 *                          or return an error.
 *   - cleanText()       -> for BODY text (descriptions/comments/notes): mask mild
 *                          profanity so the feed stays usable, but BLOCK outright on
 *                          hard slurs / sexual-explicit / CSAM terms, or if the text
 *                          is essentially all-toxic.
 *
 * Matching is done on a de-obfuscated form so leetspeak ("n1gg3r"), spacing
 * ("f u c k"), punctuation ("s.h.i.t"), homoglyphs ("nіgger") and char-stretching
 * ("fuuuuck") are all caught. Short terms that are substrings of innocent words
 * (cum, ass, sex, cock...) are matched as WHOLE WORDS to avoid the Scunthorpe
 * problem; unambiguous terms (slurs, "pornhub"...) are matched anywhere so spaced
 * evasion is caught.
 */

// ── Word lists ───────────────────────────────────────────────────────────────
// HARD = always blocked (slurs, sexual-explicit, CSAM, sexual violence). Even in
// body text these are rejected, never just masked. Split by match strategy:
//   *_WORD  -> must match as a whole de-obfuscated token (substring of innocent words)
//   *_SUB   -> matched anywhere in the de-obfuscated string (catches spaced evasion)

const HARD_WORD = [
	// sexual (whole-word: cum⊂document, sex⊂essex, ass⊂class, anal⊂canal, cock⊂peacock,
	// dick⊂dickens, tit⊂title, rape⊂grape, pedo⊂torpedo, coon⊂raccoon, spic⊂spice)
	'cum', 'cums', 'sex', 'anal', 'cock', 'cocks', 'dick', 'dicks', 'tit', 'tits', 'titty',
	'rape', 'raped', 'rapes', 'pedo', 'loli', 'shota', 'incest', 'bdsm', 'milf', 'coom',
	'cunt', 'cunts', // whole-word: cunt⊂Scunthorpe
	// slurs (whole-word to protect innocent words)
	'fag', 'fags', 'spic', 'spics', 'coon', 'coons', 'kike', 'kikes', 'gook', 'dyke', 'wop',
	// self-harm / directed hate
	'kys'
];

const HARD_SUB = [
	// slurs (unambiguous even as substrings -> catch spaced evasion "n i g g e r")
	'nigger', 'nigga', 'niglet', 'faggot', 'tranny', 'trannie', 'beaner', 'wetback',
	'chink', 'retard', 'retarded', 'sandnigger', 'porchmonkey',
	// sexual-explicit
	'fuck', 'motherfuck', 'pornhub', 'porno', 'porn', 'pussy', 'pussies', 'penis',
	'vagina', 'boob', 'boobs', 'blowjob', 'handjob', 'rimjob', 'cumshot', 'creampie',
	'cumming', 'jizz', 'jism', 'semen', 'ejacul', 'masturbat', 'hentai', 'dildo',
	'buttplug', 'fleshlight', 'gangbang', 'deepthroat', 'bukkake', 'cameltoe',
	'clitoris', 'scrotum', 'testicle', 'fellatio', 'cunnilingus',
	'whore', 'slut', 'sluts', 'hooker', 'nympho', 'footjob', 'titfuck', 'cocksuck',
	// unambiguous "cum" compounds (the bare "cum*" prefix is ambiguous: cumin,
	// cumulative, cumberland — so only these explicit compounds go in the sub list)
	'cumslut', 'cumdump', 'cumlord', 'cumrag', 'cumbucket', 'cumwhore', 'cumdumpster',
	// CSAM (critical — always block). NB: terms are stored in the DEOBFUSCATED form,
	// which folds ph->f, so "pedophile" is listed as "pedofile".
	'childporn', 'childp', 'lolicon', 'lolita', 'jailbait', 'pedofile', 'pedofil',
	'underage', 'minorattract', 'cheesepizza', 'toddlercon',
	// sexual violence
	'rapist', 'molest', 'gangrape'
];

// PROFANITY = masked in body text, blocked in strict (titles/names/prompts).
const PROF_WORD = ['ass', 'arse', 'damn', 'hell', 'crap', 'piss', 'twat', 'wank', 'turd', 'prick', 'jerkoff'];
const PROF_SUB = [
	'shit', 'bullshit', 'bitch', 'bitches', 'asshole', 'bastard', 'dumbass', 'jackass',
	'dickhead', 'douche', 'bollock', 'wanker', 'nutsack', 'ballsack', 'goddamn', 'nazi', 'hitler'
];

// ── De-obfuscation ───────────────────────────────────────────────────────────
const CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000B-\\u001F\\u007F]', 'g');

// Common unicode homoglyphs -> ascii (Cyrillic/fullwidth/accented/leet lookalikes).
const HOMOGLYPHS: Record<string, string> = {
	à: 'a', á: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a', а: 'a', '4': 'a', '@': 'a',
	е: 'e', é: 'e', è: 'e', ê: 'e', ë: 'e', '3': 'e',
	і: 'i', í: 'i', ì: 'i', î: 'i', ï: 'i', '1': 'i', '!': 'i', '|': 'i', '¡': 'i',
	о: 'o', ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o', '0': 'o',
	ѕ: 's', $: 's', '5': 's',
	с: 'c', '¢': 'c',
	'7': 't', '+': 't',
	υ: 'u', ц: 'u',
	р: 'p', ρ: 'p',
	'9': 'g',
	х: 'x', '×': 'x'
};

/** Fold to a comparable form: lowercase, homoglyphs, collapse 3+ char runs, drop non-letters. */
function deob(s: string): string {
	let out = '';
	for (const ch of s.toLowerCase()) out += HOMOGLYPHS[ch] ?? ch;
	return out
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '') // strip combining accents
		.replace(/ph/g, 'f') // common evasion: phuck -> fuck (no innocent word becomes banned)
		.replace(/(.)\1{2,}/g, '$1') // collapse 3+ identical (fuuuuck -> fuck)
		.replace(/[^a-z]/g, ''); // drop spaces/punct so "f.u.c.k" -> "fuck"
}

// ── Detection ────────────────────────────────────────────────────────────────
function scan(text: string): { hard: boolean; prof: boolean } {
	const whole = deob(text);
	const rawTokens = text.split(/[\s\-_./\\|]+/);
	const tokens = rawTokens.map((t) => deob(t)).filter(Boolean);

	// Join runs of consecutive SINGLE-letter tokens so "c u m" / "c.u.n.t" evasion
	// is caught, without turning real multi-letter words (document) into matches.
	const joinedRuns: string[] = [];
	let run = '';
	for (const t of rawTokens) {
		const d = deob(t);
		if (d.length === 1) run += d;
		else { if (run.length > 1) joinedRuns.push(run); run = ''; }
	}
	if (run.length > 1) joinedRuns.push(run);

	let hard = false, prof = false;
	const wholeWord = (w: string) => tokens.includes(w) || joinedRuns.includes(w);
	const sub = (w: string) => whole.includes(w) || joinedRuns.some((r) => r.includes(w));

	for (const w of HARD_WORD) if (wholeWord(w)) hard = true;
	for (const w of PROF_WORD) if (wholeWord(w)) prof = true;
	for (const w of HARD_SUB) if (sub(w)) hard = true;
	for (const w of PROF_SUB) if (sub(w)) prof = true;

	return { hard, prof };
}

/** True if the text contains any HARD (slur/sexual/CSAM) term — gate generated content with this. */
export function containsHardTerm(text: unknown): boolean {
	if (typeof text !== 'string' || !text) return false;
	return scan(text).hard;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * STRICT policy for titles, display names, and AI prompts: any banned hit (hard OR
 * profanity) blocks. Returns the trimmed text and a blocked flag + reason.
 */
export function moderateStrict(
	raw: unknown,
	opts: { maxLength?: number } = {}
): { text: string; blocked: boolean; reason?: string } {
	const maxLength = opts.maxLength ?? 80;
	if (typeof raw !== 'string') return { text: '', blocked: true, reason: 'empty' };
	const text = raw.replace(CONTROL_CHARS, '').replace(/[<>]/g, '').replace(/\s{2,}/g, ' ').trim().slice(0, maxLength);
	if (!text) return { text: '', blocked: true, reason: 'empty' };
	const { hard, prof } = scan(text);
	if (hard) return { text, blocked: true, reason: 'inappropriate' };
	if (prof) return { text, blocked: true, reason: 'profanity' };
	return { text, blocked: false };
}

/** Is this string safe to show as-is (strict)? Convenience wrapper. */
export function isClean(raw: unknown): boolean {
	return !moderateStrict(raw, { maxLength: 4000 }).blocked;
}

function maskWord(word: string): string {
	if (word.length <= 2) return '*'.repeat(word.length);
	return word[0] + '*'.repeat(word.length - 1);
}

/**
 * BODY policy for descriptions / comments / notes: sanitize, mask mild profanity,
 * but BLOCK outright on hard terms (slur/sexual/CSAM) or all-toxic text.
 */
export function cleanText(
	raw: unknown,
	opts: { maxLength?: number } = {}
): { text: string; blocked: boolean; reason?: string } {
	const maxLength = opts.maxLength ?? 500;
	if (typeof raw !== 'string') return { text: '', blocked: true, reason: 'empty' };

	const text = raw
		.replace(CONTROL_CHARS, '')
		.replace(/[^\S\n]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
		.slice(0, maxLength);
	if (!text) return { text: '', blocked: true, reason: 'empty' };

	// Any HARD term -> block the whole thing (never mask sexual/slur content).
	if (scan(text).hard) return { text, blocked: true, reason: 'inappropriate' };

	// Mask profanity token-by-token; block if it's essentially nothing but profanity.
	let profHits = 0, tokenCount = 0;
	const cleaned = text
		.split(/(\s+)/)
		.map((tok) => {
			if (tok === '' || /^\s+$/.test(tok)) return tok;
			tokenCount++;
			const t = scan(tok);
			if (t.prof || t.hard) { profHits++; return maskWord(tok); }
			return tok;
		})
		.join('');

	const blocked = profHits > 0 && profHits >= tokenCount;
	return { text: cleaned, blocked, reason: blocked ? 'toxic' : undefined };
}

/** Clean a public display name (strict): reject profane/obfuscated, fall back to Anonymous. */
export function cleanDisplayName(raw: unknown, fallback = 'Anonymous'): string {
	const { text, blocked } = moderateStrict(raw, { maxLength: 24 });
	return blocked || !text ? fallback : text;
}
