const Parser = require('rss-parser');
const cron = require('node-cron');
const prisma = require('../config/db');

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
});

const categories = {
    'gaming': 'https://news.google.com/rss/search?q=gaming+news+when:24h&hl=en-US',
    'sports': 'https://news.google.com/rss/search?q=sports+news+when:24h&hl=en-US',
    'anime': 'https://news.google.com/rss/search?q=anime+news+when:24h&hl=en-US',
    'movie': 'https://news.google.com/rss/search?q=movies+news+when:24h&hl=en-US'
};

async function fetchNews() {
    console.log('[NEWS SERVICE] Fetching latest Google News RSS feeds...');
    
    for (const [category, url] of Object.entries(categories)) {
        try {
            const feed = await parser.parseURL(url);
            
            for (const item of feed.items) {
                let source = item.creator || item.source || (item.title && item.title.includes(' - ') ? item.title.split(' - ').pop() : 'Google News');
                let cleanTitle = item.title ? item.title.replace(` - ${source}`, '') : 'No Title';

                // Ensure pubDate is a valid Date object, falling back to current date if invalid
                const parsedDate = new Date(item.pubDate);
                const pubDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

                await prisma.newsArticle.upsert({
                    where: { link: item.link },
                    update: {},
                    create: {
                        title: cleanTitle,
                        link: item.link,
                        pubDate: pubDate,
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

    // Clean up older than 7 days to prevent DB bloat while maintaining a robust fallback cache
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const deleted = await prisma.newsArticle.deleteMany({
            where: { createdAt: { lt: sevenDaysAgo } }
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
