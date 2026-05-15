const Parser = require('rss-parser');
const cron = require('node-cron');
const prisma = require('../config/db');

const parser = new Parser();

const categories = {
    'gaming': 'https://news.google.com/rss/search?q=gaming+news+when:3h&hl=en-US',
    'sports': 'https://news.google.com/rss/search?q=sports+news+when:3h&hl=en-US',
    'anime': 'https://news.google.com/rss/search?q=anime+news+when:3h&hl=en-US',
    'movie': 'https://news.google.com/rss/search?q=movies+news+when:3h&hl=en-US'
};

async function fetchNews() {
    console.log('[NEWS SERVICE] Fetching latest Google News RSS feeds...');
    
    for (const [category, url] of Object.entries(categories)) {
        try {
            const feed = await parser.parseURL(url);
            
            for (const item of feed.items) {
                let source = item.creator || feed.title.split(' - ').pop() || 'Google News';

                await prisma.newsArticle.upsert({
                    where: { link: item.link },
                    update: {}, // Don't override if it exists
                    create: {
                        title: item.title.replace(` - ${source}`, ''),
                        link: item.link,
                        pubDate: new Date(item.pubDate || new Date()),
                        source: source,
                        category: category
                    }
                });
            }
            console.log(`[NEWS SERVICE] Saved updates for ${category}.`);
        } catch (error) {
            console.error(`[NEWS SERVICE] Error fetching ${category} RSS:`, error.message);
        }
    }

    // Clean up older than 24 hours to prevent DB bloat
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const deleted = await prisma.newsArticle.deleteMany({
            where: { createdAt: { lt: twentyFourHoursAgo } }
        });
        if (deleted.count > 0) {
            console.log(`[NEWS SERVICE] Purged ${deleted.count} old articles.`);
        }
    } catch (err) {
        console.error('[NEWS SERVICE] Error purging old news:', err.message);
    }
}

function initNewsCron() {
    console.log('[NEWS SERVICE] Initialized node-cron job (running every 3 hours).');
    
    // Initial fetch immediately
    fetchNews();

    // Cron job: 0 */3 * * * (At minute 0 past every 3rd hour)
    cron.schedule('0 */3 * * *', fetchNews);
}

module.exports = { initNewsCron };
