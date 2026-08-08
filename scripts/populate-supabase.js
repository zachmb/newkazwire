/**
 * Script to populate Supabase database with games from games.ts
 * 
 * Usage: node scripts/populate-supabase.js
 * 
 * Prerequisites:
 * 1. Create the games table in Supabase (see supabase_schema.md)
 * 2. Set environment variables in .env
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load games from games.ts manually since it's a TS file
const gamesFileContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/data/games.ts'), 'utf8');
const gamesJson = gamesFileContent.match(/export const games = (\[[\s\S]*\]);/)[1];
const games = JSON.parse(gamesJson);

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateGames() {
    console.log(`Populating Supabase with ${games.length} games...`);

    let successCount = 0;
    let errorCount = 0;

    for (const game of games) {
        // Extract slug from href (e.g., "/games/slope" -> "slope")
        const slug = game.href.split('/').pop();

        // Transform game data to match Supabase schema
        const gameData = {
            slug: slug,
            title: game.title,
            description: game.description || `Play ${game.title} on FrogMath!`,
            thumbnail_url: game.image,
            game_url: '', // To be filled in later
            categories: game.tags || ['Arcade', 'Game'],
            is_featured: false,
            up_vote: 0,
            views: 0,
            likes: 0,
            dislikes: 0,
            dislikes: 0
        };

        // Insert or update game
        const { data, error } = await supabase
            .from('games')
            .upsert(gameData, { onConflict: 'slug' })
            .select();

        if (error) {
            console.error(`Error inserting ${game.title}:`, error.message);
            errorCount++;
        } else {
            console.log(`✓ ${game.title} (${slug})`);
            successCount++;
        }
    }

    console.log(`\nCompleted: ${successCount} successful, ${errorCount} errors`);
}

populateGames().catch(console.error);
