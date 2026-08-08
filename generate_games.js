import fs from 'fs';
import path from 'path';

const gamesDir = 'static/games';
const outputFile = 'src/lib/data/games.ts';

const files = fs.readdirSync(gamesDir);

const games = files
    .filter(file => !file.startsWith('.')) // Ignore hidden files
    .map(file => {
        const name = path.parse(file).name; // Remove extension
        // Format title: replace hyphens with spaces, capitalize words
        const title = name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        return {
            title: title,
            image: `/games/${file}`,
            href: `/games/${name}`,
            description: `Play ${title} on FrogMath!`,
            tags: ['Arcade', 'Game'] // Default tags
        };
    });

const content = `export const games = ${JSON.stringify(games, null, 4)};`;

fs.writeFileSync(outputFile, content);
console.log(`Generated ${games.length} games in ${outputFile}`);
