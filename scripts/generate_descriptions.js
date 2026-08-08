import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
const GAMES_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'games.ts');

if (!API_KEY) {
    console.error('DEEPSEEK_API_KEY not found in .env');
    process.exit(1);
}

async function generateDescription(title) {
    console.log(`Generating description for: ${title}`);
    const prompt = `Write a 500-word engaging, SEO-friendly description for the game "${title}" on the website FrogMath. 
    Explain what the game is, how to play it, its features, and why it's fun to play on FrogMath. 
    Maintain an upbeat and inviting tone. Do not use markdown formatting, just plain text with paragraphs.
    Ensure it is at least 500 words long.`;

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are an expert content writer for a gaming website.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error(`Error generating description for ${title}:`, error);
        return null;
    }
}

async function main() {
    const content = fs.readFileSync(GAMES_FILE, 'utf8');

    // Extract the array using a more robust method than simple regex if possible, 
    // but for now let's use a regex that captures the objects.
    // We'll parse the JS file by looking for the export const games = [...];
    const match = content.match(/export const games = (\[[\s\S]*\]);/);
    if (!match) {
        console.error('Could not find games array in games.ts');
        return;
    }

    let games;
    try {
        // Evaluate the string to get the JS object. 
        // Note: This is a bit risky but works for static data files like this.
        // We'll use a cleaner approach if needed.
        games = eval(match[1]);
    } catch (e) {
        console.error('Error parsing games array:', e);
        return;
    }

    console.log(`Found ${games.length} games.`);

    for (let i = 0; i < games.length; i++) {
        const game = games[i];

        // Skip if it already has a long description (likely already generated)
        if (game.description && game.description.split(' ').length > 200) {
            console.log(`Skipping ${game.title} (already has long description)`);
            continue;
        }

        const newDesc = await generateDescription(game.title);
        if (newDesc) {
            game.description = newDesc.replace(/"/g, '\\"').replace(/\n/g, '\\n');

            // Save after each successful generation to allow resuming
            const updatedContent = `export const games = ${JSON.stringify(games, null, 4)};\n`;
            fs.writeFileSync(GAMES_FILE, updatedContent);
            console.log(`Saved description for ${game.title} (${i + 1}/${games.length})`);

            // Wait a bit to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Limit to 5 for the first test run, then we can run for all
        if (i >= 4) {
            // console.log('Test run of 5 games complete. Remove limit to process all.');
            // break;
        }
    }

    console.log('Finished processing all games.');
}

main();
