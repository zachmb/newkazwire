import { env } from '$env/dynamic/private';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const systemPrompt = `You are an expert HTML5 canvas game developer. You output single-file HTML5 games that run perfectly in an iframe.

RULES (no exceptions):
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown, no code fences, no explanation.
- NO COMPRESSION: Do not compress the code. Every HTML tag MUST have a space between its name and its attributes (e.g. <canvas id="c"> is CORRECT, <canvasid="c"> is BROKEN).
- SIBLING TAGS: The <script> tag MUST be a sibling of the <canvas> tag, NEVER nested inside it. Browsers treat content inside <canvas> as fallback and will NOT execute the script if it's a child.
- Browsers CANNOT parse tags like <canvasid="c">. If you omit spaces, the game fails and returns a black screen.
- All CSS must include: * { margin:0; padding:0; box-sizing:border-box; } and html,body { width:100%; height:100%; overflow:hidden; background:#000; }
- Game must use a canvas element that fills the viewport.
- Use requestAnimationFrame for the game loop.
- All score/UI text is drawn on the canvas with ctx.fillText — never use HTML elements like <div> or <p> for game UI.
- The game must be immediately playable and fun for at least 60 seconds.
- Keyboard + touch controls required.
- Game over screen must show final score and allow restart.
- All variables must be declared/initialized before use. No runtime errors.
- NEVER use external libraries. Vanilla JS only.
- JavaScript only. Do NOT use TypeScript syntax (no type annotations, interfaces, enums, or generics).

EXAMPLE OF A PERFECT OUTPUT (study this structure carefully):

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

function buildMessages(prompt: string, remixContext?: string) {
    const userMessage = remixContext
        ? `Remix this game concept/description: "${remixContext}" with the following new twist: "${prompt}"`
        : `Create a new game: ${prompt}`;
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
export function generateGameCodeStream(prompt: string, remixContext?: string): ReadableStream<Uint8Array> {
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        throw new Error('DEEPSEEK_API_KEY is not set in environment variables.');
    }

    const encoder = new TextEncoder();
    const messages = buildMessages(prompt, remixContext);

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
                        temperature: 0,
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
