import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Formats a closing date nicely ────────────────────────────────────────────
function formatClosesAt(date) {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    if (d < now) return 'Closed';
    const diff = Math.round((d - now) / 1000 / 60);
    if (diff < 60) return `Closes in ${diff}m`;
    if (diff < 1440) return `Closes in ${Math.round(diff / 60)}h`;
    return `Closes ${DAYS[d.getDay()]} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// ── Single Poll card rendered inline in the chat timeline ────────────────────
const PollMessage = ({ poll: initialPoll, currentUserId }) => {
    const [poll, setPoll] = useState(initialPoll);
    const [isVoting, setIsVoting] = useState(false);

    const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length ?? 0), 0);
    const myVote = poll.options.find(o => o.votes?.some(v => v.userId === currentUserId));
    const hasVoted = Boolean(myVote);
    const isClosed = poll.isClosed || (poll.closesAt && new Date(poll.closesAt) < new Date());

    const handleVote = async (optionId) => {
        if (hasVoted || isClosed || isVoting) return;
        setIsVoting(true);
        try {
            const { data } = await api.post(`/api/messages/polls/${poll.id}/vote`, { optionId });
            setPoll(data);
        } catch (err) {
            console.error('[POLL] Vote failed:', err);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="my-3 w-full max-w-sm">
            <div className="rounded-2xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)] overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-4 pt-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="material-symbols-outlined text-[14px] text-purple-500">how_to_vote</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500">Poll</span>
                        </div>
                        {poll.closesAt && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isClosed
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-emerald-100 text-emerald-700'
                            }`}>
                                {formatClosesAt(poll.closesAt)}
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-bold text-[var(--color-on-surface)] leading-snug">
                        {poll.question}
                    </p>
                </div>

                {/* Options */}
                <div className="px-4 pb-4 space-y-2">
                    {poll.options.map((option) => {
                        const count = option.votes?.length ?? 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const isMyVote = myVote?.id === option.id;

                        return (
                            <button
                                key={option.id}
                                onClick={() => handleVote(option.id)}
                                disabled={hasVoted || isClosed || isVoting}
                                className={`w-full text-left rounded-xl overflow-hidden relative transition-all
                                    ${!hasVoted && !isClosed ? 'hover:ring-2 hover:ring-purple-400 cursor-pointer' : 'cursor-default'}
                                    ${isMyVote ? 'ring-2 ring-purple-500' : 'ring-1 ring-[var(--color-outline-variant)]/30'}
                                `}
                            >
                                {/* Progress fill */}
                                <motion.div
                                    className={`absolute inset-0 rounded-xl ${isMyVote ? 'bg-purple-500/20' : 'bg-[var(--color-surface-container-high)]'}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: hasVoted || isClosed ? `${pct}%` : '0%' }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                />
                                {/* Label */}
                                <div className="relative flex items-center justify-between px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        {isMyVote && (
                                            <span className="material-symbols-outlined text-purple-500 text-[14px]"
                                                style={{ fontVariationSettings: "'FILL' 1" }}>
                                                check_circle
                                            </span>
                                        )}
                                        <span className={`text-xs font-semibold ${isMyVote ? 'text-purple-600' : 'text-[var(--color-on-surface)]'}`}>
                                            {option.text}
                                        </span>
                                    </div>
                                    {(hasVoted || isClosed) && (
                                        <span className="text-xs font-bold text-[var(--color-on-surface-variant)]">
                                            {pct}%
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-[var(--color-outline-variant)]/20 flex items-center justify-between">
                    <span className="text-[10px] text-[var(--color-on-surface-variant)]">
                        {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-[var(--color-on-surface-variant)]">
                        by {poll.creator?.name}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PollMessage;
