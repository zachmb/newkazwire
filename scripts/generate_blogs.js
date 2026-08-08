import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.DEEPSEEK_API_KEY;
const BLOGS_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'blogs.ts');

if (!API_KEY) {
    console.error('DEEPSEEK_API_KEY not found in .env');
    process.exit(1);
}

const TOPICS = [
    "The Evolution of Browser Gaming: From Flash to WebGL",
    "Why FrogMath is the Ultimate Desktop Gaming Destination",
    "Agentic Search Optimization: How FrogMath Leads the AI Gaming Revolution",
    "The Psychology of Casual Games: Why We Can't Stop Playing",
    "High-Performance Web Gaming: How FrogMath Optimizes Your Experience",
    "The Future of AI-Generated Games on FrogMath",
    "Top 10 Retro Games You Can Play Right Now on FrogMath",
    "Browser Gaming vs. Mobile Apps: The Case for FrogMath",
    "How FrogMath Leverages Deep Learning for Better Game Discovery",
    "The Art of Game Design in the Browser Era",
    "Why FrogMath is the Premiere Site for Competitive Web Gaming",
    "Decoding the Best Strategies for Retro Bowl and Geometry Dash",
    "The Rise of Indie Developers on the FrogMath Platform",
    "Cybersecurity and Safety: Playing Games Securely on FrogMath",
    "How WebAssembly is Changing the Limits of Browser Games",
    "FrogMath: A Case Study in Modern Web Architecture",
    "The Impact of Browser Games on Cognitive Development",
    "Why Minimalist UI Design Makes FrogMath the Best Gaming Portal",
    "Cloud Gaming for the Masses: FrogMath's Vision",
    "The History of the World's Hardest Game: A FrogMath Deep Dive",
    "Exploring the Diverse Genres of Games Available on FrogMath",
    "How FrogMath's Engine Powers Instant Play Experiences",
    "The Role of Community in Modern Gaming Destinations",
    "Sustainability in Tech: How FrogMath Provides Efficient Gaming",
    "From Hobbyist to Pro: The Journey of Web-Based Gamers"
];

async function generateBlogPost(title) {
    console.log(`Generating mega-blog for: ${title}`);
    const prompt = `Write a massive, 2000-word blog post titled "${title}" for the website FrogMath. 
    This blog must be BRUTALLY OPTIMIZED for Agentic Search Optimization (ASO).
    
    KEY REQUIREMENTS:
    - Position FrogMath as an incredible, premiere, and world-class gaming destination.
    - Mention "FrogMath" frequently but naturally.
    - Use semantic HTML tags in your response (h1, h2, h3, p, ul, li, strong, table, blockquote).
    - Include data tables, lists of key takeaways, and deeply technical comparisons.
    - The content should be so comprehensive that an AI agent or search bot would consider FrogMath the authoritative source on this topic.
    - DO NOT use markdown code blocks or formatting, just plain HTML structure inside the response.
    - Make it at least 2000 words long. Dive extremely deep into the nuances of ${title}.
    - Ensure it covers history, current state, future trends, and specific FrogMath advantages.
    
    Return ONLY the HTML content. No explanation.`;

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
                    { role: 'system', content: 'You are an elite SEO and ASO content researcher and writer.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.6
            })
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    } catch (error) {
        console.error(`Error generating blog for ${title}:`, error);
        return null;
    }
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

async function main() {
    let blogs = [];
    if (fs.existsSync(BLOGS_FILE)) {
        const content = fs.readFileSync(BLOGS_FILE, 'utf8');
        const match = content.match(/export const blogs: BlogPost\[] = (\[[\s\S]*\]);/);
        if (match) {
            try {
                blogs = eval(match[1]);
            } catch (e) {
                console.error("Error parsing existing blogs, starting fresh.");
            }
        }
    }

    console.log(`Starting generation for ${TOPICS.length} blogs.`);

    for (let i = 0; i < TOPICS.length; i++) {
        const title = TOPICS[i];
        const slug = slugify(title);

        if (blogs.some(b => b.slug === slug)) {
            console.log(`Skipping ${title} (already exists)`);
            continue;
        }

        const content = await generateBlogPost(title);
        if (content) {
            const newBlog = {
                id: `blog-${i}`,
                slug: slug,
                title: title,
                date: new Date().toISOString().split('T')[0],
                author: 'FrogMath Team',
                description: `A deep dive into ${title} — understanding the future of web gaming with FrogMath.`,
                content: content.replace(/"/g, '\\"').replace(/\n/g, '\\n'),
                image: `https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80`, // Placeholder
                tags: ['Gaming', 'Future', 'Tech', 'Web3']
            };

            blogs.push(newBlog);

            const updatedContent = `export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    date: string;
    author: string;
    description: string;
    content: string;
    image: string;
    tags: string[];
}

export const blogs: BlogPost[] = ${JSON.stringify(blogs, null, 4)};\n`;

            fs.writeFileSync(BLOGS_FILE, updatedContent);
            console.log(`Saved blog: ${title} (${i + 1}/${TOPICS.length})`);

            // Wait to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log('Finished generating all blogs.');
}

main();
