import React, { useState, useEffect } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';

const LiveThread = () => {
    const [updates, setUpdates] = useState({
        sports: [], anime: [], movie: [], gaming: []
    });
    const [activeTab, setActiveTab] = useState('gaming');
    const [loading, setLoading] = useState(true);

    const communities = ['gaming', 'sports', 'anime', 'movie'];

    useEffect(() => {
        let isMounted = true;
        const fetchNews = async () => {
            setLoading(true);
            try {
                const results = { gaming: [], sports: [], anime: [], movie: [] };
                await Promise.all(communities.map(async (c) => {
                    try {
                        const res = await api.get(`/api/news/${c}`);
                        results[c] = res.data.map(article => ({
                            id: article.id,
                            content: article.title,
                            timestamp: article.pubDate,
                            link: article.link,
                            source: article.source || 'Coverage'
                        }));
                    } catch (err) {
                        console.error(`Failed to fetch ${c}`, err);
                    }
                }));
                if (isMounted) setUpdates(results);
            } catch (e) {
                console.error("Failed to fetch RSS news", e);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchNews();
        
        // Refresh every 3 hours (10800000 ms) matching cron
        const interval = setInterval(fetchNews, 10800000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="hidden xl:flex w-96 flex-col border-l border-white/10 bg-black/40 backdrop-blur-md rounded-r-3xl overflow-hidden relative shrink-0">
            <div className="h-20 flex items-center justify-center border-b border-white/10 glass z-20 shrink-0">
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                    </span>
                    News Feed
                </h2>
            </div>

            <div className="flex justify-around p-3 border-b border-white/5 bg-white/5 shrink-0">
                {communities.map(c => (
                    <button 
                        key={c}
                        onClick={() => setActiveTab(c)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl uppercase tracking-widest transition-all duration-300 ${
                            activeTab === c 
                            ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                            : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
                <AnimatePresence mode="popLayout">
                    {loading && updates[activeTab]?.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full text-slate-500 opacity-70"
                        >
                            <svg className="animate-spin w-12 h-12 mb-3 text-indigo-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-sm font-medium">Fetching RSS Feeds...</span>
                        </motion.div>
                    ) : updates[activeTab]?.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center h-full text-slate-500 opacity-70"
                        >
                            <svg className="w-12 h-12 mb-3 text-slate-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <span className="text-sm font-medium">No recent news found.</span>
                        </motion.div>
                    ) : (
                        updates[activeTab].map((item, idx) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                key={item.id + '-' + idx}
                                className="mb-4 bg-black/20 border border-white/5 p-4 rounded-2xl hover:bg-white/5 transition-all duration-300 group shadow-lg overflow-hidden"
                            >
                                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                                    <span className="flex items-center gap-1 font-semibold">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                                      {item.source}
                                    </span>
                                    <span className="text-slate-500 font-medium bg-black/30 px-2 py-1 rounded-md">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <a 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[13px] text-gray-200 leading-snug font-medium group-hover:text-indigo-300 transition-colors block"
                                >
                                    {item.content}
                                </a>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
            
            <div className="p-3 border-t border-white/5 bg-black/40 text-center shrink-0">
                <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium tracking-wide">
                  Powered by <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Google News RSS</span>
                </p>
            </div>
        </div>
    );
};

export default LiveThread;
