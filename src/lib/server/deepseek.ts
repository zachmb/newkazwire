import { env } from '$env/dynamic/private';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const systemPrompt = `You are a senior HTML5 game developer with a great sense of game feel. You output single-file HTML5 games that run perfectly in an iframe AND are genuinely fun, polished, and replayable — not bare-minimum demos.

HARD FORMAT RULES (no exceptions — breaking these produces a black screen):
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences, no explanation.
- NO COMPRESSION: Do not minify. Every HTML tag MUST have a space between its name and its attributes (e.g. <canvas id="c"> is CORRECT, <canvasid="c"> is BROKEN).
- SIBLING TAGS: The <script> tag MUST be a sibling of the <canvas> tag, NEVER nested inside it. Browsers treat content inside <canvas> as fallback and will NOT execute the script if it's a child.
- All CSS must include: * { margin:0; padding:0; box-sizing:border-box; } and html,body { width:100%; height:100%; overflow:hidden; }
- Use a single <canvas> that fills the viewport, and handle window 'resize' so it always fits.
- Use requestAnimationFrame with delta-time so speed is frame-rate independent.
- All in-game UI/score/text is drawn on the canvas with ctx.fillText — never HTML <div>/<p> for game UI.
- All variables declared/initialized before use. No runtime errors, ever.
- NEVER use external libraries, assets, images, or fonts. Vanilla JS + canvas only (procedural art with shapes/gradients). Sound is OK via the Web Audio API (oscillator beeps) — no audio files.
- JavaScript only — NO TypeScript syntax (no type annotations, interfaces, enums, generics).

QUALITY BAR (this is what makes the game GOOD — do all of it):
- START SCREEN: open on a titled start screen with the game name, a one-line how-to-play, and "Tap / Press any key to start". Don't drop the player straight into motion.
- GAME FEEL / JUICE: add particles on impacts/pickups/deaths, a short screen-shake on big hits, easing/tweening on UI, and satisfying Web Audio blips for actions (jump, score, hit, game over). Juice is the difference between bland and fun.
- COHESIVE ART: pick a deliberate, attractive color palette (a themed background — NOT plain black — plus 3-4 harmonious colors) and stick to it. Use gradients, glows, rounded shapes; make it look designed.
- DIFFICULTY CURVE: start easy and ramp up (speed/spawn-rate/complexity) so it stays engaging; escalating challenge, not a flat loop.
- FEEDBACK: score pops, combo/streak counter where it fits, a persistent hi-score kept in a variable for the session, clear visual/audio feedback for every action.
- CONTROLS: full keyboard AND touch/pointer support, both working well; show the controls on the start screen.
- GAME OVER: a proper game-over screen with final score, hi-score, and one-tap restart.
- Aim for something a player would actually want to replay — tight controls, clear goal, mounting tension. Make it fun for well past 60 seconds.

EXAMPLE OF A PERFECT OUTPUT STRUCTURE (study the tag structure — your game must be richer than this):

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Snake</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #111; display: flex; align-items: center; justify-content: center; }
canvas { display: block; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const SZ = Math.min(window.innerWidth, window.innerHeight);
canvas.width = SZ; canvas.height = SZ;
const GRID = 20, CELL = Math.floor(SZ / GRID);
let snake, dir, nextDir, food, score, hiScore = 0, dead, speed, frame;
function rand(n) { return Math.floor(Math.random() * n); }
function placeFood() {
  let pos;
  do { pos = { x: rand(GRID), y: rand(GRID) }; }
  while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}
function init() {
  const mid = Math.floor(GRID / 2);
  snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }];
  dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
  score = 0; dead = false; speed = 150; frame = 0;
  placeFood();
}
function loop(ts) {
  if (!frame || ts - frame > speed) {
    // ... game step logic ...
    frame = ts;
  }
  requestAnimationFrame(loop);
}
init();
requestAnimationFrame(loop);
</script>
</body>
</html>

Now write a NEW fully working game based on the user's prompt. Be extremely careful to follow the SIBLING TAGS and NO TAG MERGING rules.
`;

function buildMessages(prompt: string, remixContext?: string, remixCode?: string) {
    let userMessage: string;
    if (remixCode && remixCode.trim()) {
        // True remix: give the model the ACTUAL source game to modify, plus the edit
        // request, and require a complete standalone game back (not a diff).
        const src = remixCode.slice(0, 120_000); // cap so we never blow the context window
        userMessage =
            `You are REMIXING an existing HTML5 game. Here is its COMPLETE current source code between the markers — study it, then apply the requested change while keeping what already works.\n\n` +
            `----- BEGIN SOURCE GAME -----\n${src}\n----- END SOURCE GAME -----\n\n` +
            (remixContext ? `Original concept: "${remixContext}".\n` : '') +
            `Requested change / new twist: "${prompt}"\n\n` +
            `Output the COMPLETE modified game as a single self-contained HTML file (same format rules as always — no diffs, no explanation, keep it fully playable).`;
    } else if (remixContext) {
        userMessage = `Remix this game concept/description: "${remixContext}" with the following new twist: "${prompt}"`;
    } else {
        userMessage = `Create a new game: ${prompt}`;
    }
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];
}

function stripMarkdown(code: string): string {
    if (code.startsWith('```html')) {
        return code.replace(/^```html/, '').replace(/```$/, '').trim();
    } else if (code.startsWith('```')) {
        return code.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return code;
}

/**
 * Streaming version — returns a ReadableStream of SSE text events.
 * Each event is `data: <token>\n\n`. Final event is `data: [DONE]\n\n`.
 * A heartbeat `data: [PING]\n\n` is sent every 15 s to keep Cloudflare alive.
 */
export function generateGameCodeStream(prompt: string, remixContext?: string, remixCode?: string): ReadableStream<Uint8Array> {
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is not set in environment variables.');
    }

    const encoder = new TextEncoder();
    const messages = buildMessages(prompt, remixContext, remixCode);

    return new ReadableStream<Uint8Array>({
        async start(controller) {
            // Heartbeat interval — keeps Cloudflare from treating the connection as idle
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode('data: [PING]\n\n'));
                } catch {
                    clearInterval(heartbeat);
                }
            }, 15_000);

            try {
                const response = await fetch(DEEPSEEK_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages,
                        // A little heat makes games varied + creative instead of the
                        // same bland template every time; the strict format rules +
                        // worked example keep the output well-formed. max_tokens is
                        // raised so a richer, polished game isn't truncated mid-file.
                        temperature: 0.7,
                        max_tokens: 8192,
                        stream: true
                    })
                });

                if (!response.ok || !response.body) {
                    const err = await response.text();
                    throw new Error(`DeepSeek API error: ${response.status} ${err}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    // Keep the last (potentially incomplete) line in the buffer
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        const data = line.slice(6);
                        if (data === '[DONE]') continue; // We'll send our own done

                        try {
                            const parsed = JSON.parse(data);
                            const delta = parsed.choices?.[0]?.delta?.content;
                            if (delta) {
                                // URL-encode each chunk so special characters (including literal "\n")
                                // survive SSE transport without mutation on the client.
                                const encoded = encodeURIComponent(delta);
                                controller.enqueue(encoder.encode(`data: [TOK]${encoded}\n\n`));
                            }
                        } catch {
                            // Ignore malformed JSON chunks
                        }
                    }
                }

                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (err: any) {
                controller.enqueue(
                    encoder.encode(`data: [ERROR] ${encodeURIComponent(err.message)}\n\n`)
                );
            } finally {
                clearInterval(heartbeat);
                controller.close();
            }
        }
    });
}
