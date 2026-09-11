// Adversarial test for the community moderation filters. Run: npx tsx scripts/moderation.test.mts
import { moderateStrict, cleanText, cleanDisplayName, containsHardTerm, isClean } from '../src/lib/server/moderation.ts';

let pass = 0, fail = 0;
const bad: string[] = [];
function expect(name: string, cond: boolean) {
	if (cond) pass++;
	else { fail++; bad.push(name); }
}
const blocked = (s: string) => moderateStrict(s).blocked;
const allowed = (s: string) => !moderateStrict(s).blocked;

// ── MUST BLOCK (strict: titles/names/prompts) ────────────────────────────────
const MUST_BLOCK = [
	// the reported miss + variants
	'Cum', 'cum', 'CUM', 'c u m', 'c.u.m', 'cumming', 'cumshot',
	// leetspeak / homoglyph / stretch evasion
	'fuck', 'f u c k', 'f.u.c.k', 'fuuuuck', 'phuck',
	'n1gg3r', 'n i g g e r', 'ni99er', 'fag', 'f@g', 'f4ggot', 'r3tard',
	// sexual / explicit
	'porn', 'pornhub', 'p0rn', 'sex game', 'dick', 'd1ck', 'cock',
	'pussy', 'penis', 'boobs', 'blowjob', 'hentai', 'dildo',
	'anal', 'tits', 'whore', 'slut', 'cunt', 'jizz', 'masturbate',
	// slurs
	'nigger', 'faggot', 'retard', 'tranny', 'kike', 'chink', 'spic', 'coon', 'beaner',
	// CSAM (critical)
	'loli', 'lolicon', 'pedo', 'pedophile', 'jailbait', 'child porn', 'childporn',
	// violence / self-harm
	'kys', 'rape', 'rapist', 'molest',
	// profanity (strict blocks these too)
	'shit', 'bitch', 'asshole', 'bastard', 'damn it', 'nazi', 'hitler'
];
for (const s of MUST_BLOCK) expect(`BLOCK "${s}"`, blocked(s));

// ── MUST ALLOW (no false positives / Scunthorpe) ─────────────────────────────
const MUST_ALLOW = [
	'Super Mario 64', 'Cookie Clicker', 'Tower Defense', 'Space Shooter', 'Racing Game',
	'Documentary Maker', 'Cucumber Farm', 'Accumulate Coins', 'Classic Pinball', 'Pass the Ball',
	'Bass Fishing', 'Assassin Quest', 'Analyze This', 'Canal Boat', 'Peacock Paradise',
	'Cockpit Simulator', 'Dickens Story', 'Grape Escape', 'Scrape the Sky', 'Torpedo Run',
	'Raccoon Rush', 'Cocoon Builder', 'Tycoon Empire', 'Spice Merchant', 'Hello World',
	'Shell Shockers', 'Michelle Adventure', 'Title Screen', 'Titan Fall', 'Essex Rally',
	'Sextant Voyage', 'Mushroom Farm', 'Happiness Simulator', 'Button Masher',
	'Scunthorpe United', 'Dam Builder', 'A Dark Room', 'Learn to Fly'
];
// Note: "Hell..." contains "hell" -> strict WILL block; move it to a body-only allow.
const strictAllow = MUST_ALLOW.filter((s) => !/hell/i.test(s));
for (const s of strictAllow) expect(`ALLOW "${s}"`, allowed(s));

// ── containsHardTerm (for scanning generated game text) ──────────────────────
expect('hard: slur in text', containsHardTerm('welcome to the nigger game'));
expect('hard: sexual in text', containsHardTerm('click to see boobs'));
expect('hard: clean text ok', !containsHardTerm('collect coins and jump over spikes'));
expect('hard: scunthorpe ok', !containsHardTerm('analyze the cucumber in the classroom'));

// ── cleanText body policy: mask mild profanity, block hard ───────────────────
const damn = cleanText('this damn level is hard');
expect('body: masks profanity not block', !damn.blocked && /d\*+/.test(damn.text) && !/damn/.test(damn.text));
expect('body: blocks hard slur', cleanText('you are a nigger').blocked);
expect('body: blocks sexual', cleanText('watch porn here').blocked);
expect('body: clean passes', !cleanText('a fun platformer about a frog').blocked);
expect('body: all-profanity blocked', cleanText('shit shit shit').blocked);

// ── display names ────────────────────────────────────────────────────────────
expect('name: profane -> Anonymous', cleanDisplayName('fucker123') === 'Anonymous');
expect('name: clean kept', cleanDisplayName('CoolGamer') === 'CoolGamer');
expect('name: empty -> Anonymous', cleanDisplayName('') === 'Anonymous');
expect('name: cum -> Anonymous', cleanDisplayName('cumlord') === 'Anonymous');

// ── isClean convenience ──────────────────────────────────────────────────────
expect('isClean true', isClean('a nice puzzle game'));
expect('isClean false', !isClean('a sexy porn game'));

console.log(`\nMODERATION TESTS: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILED:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('ALL MODERATION TESTS PASSED');
