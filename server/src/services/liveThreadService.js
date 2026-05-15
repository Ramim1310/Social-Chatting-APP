const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config();

const communities = ['sports', 'anime', 'movie', 'gaming'];
const FETCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Cache to store the latest updates so new clients don't wait 5 minutes
const updatesCache = {
    sports: null,
    anime: null,
    movie: null,
    gaming: null
};

function initLiveThread(io) {
    console.log('[LIVE THREAD] Service initialized. It will fetch grounded updates every 5 minutes.');
    
    io.on('connection', (socket) => {
        communities.forEach(community => {
            if (updatesCache[community]) {
                socket.emit('live_thread_update', updatesCache[community]);
            }
        });

        // Send when explicitly requested by client component mount
        socket.on('request_live_thread_updates', () => {
            console.log(`[LIVE THREAD] Received explicit request from socket ${socket.id}`);
            communities.forEach(community => {
                if (updatesCache[community]) {
                    console.log(`[LIVE THREAD] Sending cached explicitly for ${community}`);
                    socket.emit('live_thread_update', updatesCache[community]);
                } else {
                    console.log(`[LIVE THREAD] Cache empty for ${community}`);
                }
            });
        });
    });

    const fetchUpdates = async () => {
        try {
            console.log('[LIVE THREAD] Fetching live data via Google Grounding...');
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

            for (const community of communities) {
                try {
                    const prompt = `Search for the most recent and breaking updates about "${community}". Provide a concise list of the 3 most important breaking news bullet points.`;
                    
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                        config: {
                            tools: [{ googleSearch: {} }],
                        }
                    });

                    const updateData = {
                        community,
                        content: response.text,
                        timestamp: new Date().toISOString()
                    };

                    // Cache it
                    updatesCache[community] = updateData;

                    // Emit to all connected clients
                    io.emit('live_thread_update', updateData);
                    
                    console.log(`[LIVE THREAD] Pushed update for ${community}.`);
                } catch (e) {
                    console.error(`[LIVE THREAD] Error fetching for ${community}:`, e.message);
                    
                    if (!updatesCache[community]) {
                        const fallbackData = {
                            community,
                            content: `⚠️ Google API Rate Limit Reached.\n\nWe are currently experiencing high traffic for live grounding searches. The automated feed will retry in the next refresh cycle.`,
                            timestamp: new Date().toISOString()
                        };
                        updatesCache[community] = fallbackData;
                        io.emit('live_thread_update', fallbackData);
                        console.log(`[LIVE THREAD] Sent cache fallback for ${community}`);
                    }
                }
            }
        } catch (error) {
            console.error('[LIVE THREAD] Loop failed:', error);
        }
    };

    // Initial fetch immediately
    fetchUpdates();

    // Then interval
    setInterval(fetchUpdates, FETCH_INTERVAL_MS);
}

module.exports = { initLiveThread };
