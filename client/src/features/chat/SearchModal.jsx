import useModalFocus from '../../components/common/useModalFocus';
import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

// ── Strips HTML tags from ts_headline output for safe display ────────────────
// We safely render the highlighted HTML using dangerouslySetInnerHTML since it
// comes from our own trusted PostgreSQL server.
const Headline = ({ html }) => <span className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">{String(html || '').split(/<b>(.*?)<\/b>/gi).map((part, index) => index % 2 ? <mark key={index} className="bg-[var(--color-primary-fixed)] text-[var(--color-primary)] rounded px-0.5">{part.replace(/<[^>]*>/g, '')}</mark> : part.replace(/<[^>]*>/g, ''))}</span>;

const SearchModal = ({ onClose, currentRoom }) => {
    const modalRef = useModalFocus(true, onClose);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [scopeToRoom, setScopeToRoom] = useState(Boolean(currentRoom));
    const inputRef = useRef(null);


    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Cancel older searches so their results cannot replace a newer query.
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            if (!query.trim()) { setResults([]); setIsSearching(false); return; }
            setIsSearching(true);
            try {
                const params = { q: query.trim() };
                if (scopeToRoom && currentRoom) params.room = currentRoom;
                const { data } = await api.get('/api/messages/search', { params, signal: controller.signal });
                if (!controller.signal.aborted) setResults(data);
            } catch (err) { if (err.code !== 'ERR_CANCELED') setResults([]); }
            finally { if (!controller.signal.aborted) setIsSearching(false); }
        }, 300);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [query, scopeToRoom, currentRoom]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
               ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            ref={modalRef} role="dialog" aria-modal="true" aria-label="Search messages"
            className="fixed inset-0 z-[150] flex items-start justify-center pt-[10vh] bg-black/50 backdrop-blur-sm px-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <Motion.div
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-[var(--color-outline-variant)]/20"
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-outline-variant)]/20">
                    <span className={`material-symbols-outlined text-[20px] transition-colors ${isSearching ? 'text-purple-500 animate-spin' : 'text-[var(--color-on-surface-variant)]'}`}>
                        {isSearching ? 'sync' : 'search'}
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        aria-label="Search messages"
                        placeholder="Search all messages..."
                        className="flex-1 bg-transparent text-sm font-medium text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)] focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                        {currentRoom && (
                            <button
                                onClick={() => setScopeToRoom(prev => !prev)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                                    scopeToRoom
                                        ? 'bg-purple-500/15 text-purple-600'
                                        : 'bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[12px]">filter_alt</span>
                                This room
                            </button>
                        )}
                        <kbd className="text-[10px] px-2 py-1 rounded-md bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] font-mono">ESC</kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="p-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-outline)] px-3 py-2">
                                {results.length} result{results.length !== 1 ? 's' : ''}
                            </p>
                            {results.map((msg) => (
                                <button
                                    key={msg.id}
                                    className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-[var(--color-surface-container-low)] transition-colors group"
                                >
                                    {/* Avatar */}
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shrink-0 text-white text-xs font-black">
                                        {msg.senderImage
                                            ? <img src={msg.senderImage} className="w-full h-full rounded-lg object-cover" />
                                            : (msg.senderName || '?').charAt(0).toUpperCase()
                                        }
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-xs font-bold text-[var(--color-on-surface)]">{msg.senderName}</span>
                                            <span className="text-[10px] text-[var(--color-outline)]">{formatDate(msg.timestamp)}</span>
                                            <span className="text-[10px] text-[var(--color-outline)] ml-auto">#{msg.room}</span>
                                        </div>
                                        <Headline html={msg.headline || msg.content} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query && !isSearching ? (
                        <div className="py-16 text-center">
                            <span className="material-symbols-outlined text-4xl text-[var(--color-outline)] mb-3 block">search_off</span>
                            <p className="text-sm text-[var(--color-on-surface-variant)] font-medium">No messages found for "<strong>{query}</strong>"</p>
                        </div>
                    ) : !query ? (
                        <div className="py-12 text-center">
                            <p className="text-xs text-[var(--color-outline)] font-medium">Type to search across all message history</p>
                            <p className="text-[10px] text-[var(--color-outline)] mt-1">Powered by PostgreSQL full-text search</p>
                        </div>
                    ) : null}
                </div>
            </Motion.div>
        </div>
    );
};

export default SearchModal;
