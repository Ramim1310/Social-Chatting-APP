import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = ['12a', '3a', '6a', '9a', '12p', '3p', '6p', '9p'];

// ── Returns a CSS opacity string based on count relative to max ──────────────
function cellOpacity(count, max) {
    if (!count || !max) return 0.04;
    return 0.1 + (count / max) * 0.85;
}

// ── Formats large numbers (1234 → 1.2K) ─────────────────────────────────────
function formatCount(n) {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
}

const RoomAnalytics = ({ room }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tooltip, setTooltip] = useState(null); // { day, hour, count, x, y }

    useEffect(() => {
        if (!room) return;
        setIsLoading(true);
        api.get(`/api/messages/analytics/room/${encodeURIComponent(room)}`)
            .then(res => setData(res.data))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [room]);

    if (isLoading) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[var(--color-surface-container-high)] border-t-purple-500 rounded-full animate-spin" />
        </div>
    );

    if (!data) return (
        <div className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">Failed to load analytics.</div>
    );

    // Build 7×24 matrix from flat heatmap rows
    const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    data.heatmap.forEach(({ day, hour, count }) => {
        matrix[day][hour] = count;
    });
    const maxCount = Math.max(...data.heatmap.map(r => r.count), 1);

    // Peak hour and peak day
    const peakEntry = data.heatmap.reduce((a, b) => b.count > a.count ? b : a, { count: 0, hour: 0, day: 0 });

    const summary = data.summary;
    const totalMessages = summary.total_messages ?? 0;
    const uniqueSenders = summary.unique_senders ?? 0;

    return (
        <div className="p-5 space-y-6">
            {/* ── Summary Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Messages (30d)', value: formatCount(totalMessages), icon: 'chat_bubble' },
                    { label: 'Active Members', value: uniqueSenders, icon: 'group' },
                    { label: 'Peak Day', value: DAYS[peakEntry.day], icon: 'today' },
                    { label: 'Peak Hour', value: `${peakEntry.hour}:00`, icon: 'schedule' },
                ].map(({ label, value, icon }) => (
                    <div key={label} className="bg-[var(--color-surface-container-low)] rounded-2xl p-3.5 border border-[var(--color-outline-variant)]/20">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">{icon}</span>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-outline)]">{label}</p>
                        </div>
                        <p className="text-xl font-black text-[var(--color-on-surface)] font-display">{value}</p>
                    </div>
                ))}
            </div>

            {/* ── Activity Heatmap ─────────────────────────────────────────── */}
            <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-outline)] mb-3">
                    Activity Heatmap · Last 30 Days
                </h3>

                {/* Hour axis labels */}
                <div className="flex ml-8 mb-1">
                    {HOUR_LABELS.map((label, i) => (
                        <div key={i} className="flex-1 text-[8px] text-[var(--color-outline)] text-center">{label}</div>
                    ))}
                </div>

                {/* Grid */}
                <div className="space-y-1 relative">
                    {matrix.map((row, dayIdx) => (
                        <div key={dayIdx} className="flex items-center gap-1">
                            {/* Day label */}
                            <div className="w-7 text-[9px] font-semibold text-[var(--color-outline)] text-right shrink-0">
                                {DAYS[dayIdx]}
                            </div>
                            {/* Hour cells */}
                            {row.map((count, hourIdx) => (
                                <div
                                    key={hourIdx}
                                    className="flex-1 h-4 rounded-sm cursor-pointer transition-transform hover:scale-125 relative group"
                                    style={{ backgroundColor: `rgba(147, 51, 234, ${cellOpacity(count, maxCount)})` }}
                                    title={`${DAYS[dayIdx]} ${hourIdx}:00 — ${count} messages`}
                                />
                            ))}
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-3 justify-end">
                    <span className="text-[9px] text-[var(--color-outline)]">Less</span>
                    {[0.05, 0.2, 0.45, 0.7, 0.95].map(op => (
                        <div key={op} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(147, 51, 234, ${op})` }} />
                    ))}
                    <span className="text-[9px] text-[var(--color-outline)]">More</span>
                </div>
            </div>

            {/* ── Top Contributors ─────────────────────────────────────────── */}
            {data.topContributors?.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-outline)] mb-3">
                        Top Contributors
                    </h3>
                    <div className="space-y-2">
                        {data.topContributors.map((contributor, idx) => {
                            const maxMsgs = data.topContributors[0].message_count;
                            const pct = Math.round((contributor.message_count / maxMsgs) * 100);
                            return (
                                <div key={contributor.id} className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-[var(--color-outline)] w-4 text-right shrink-0">
                                        {idx + 1}
                                    </span>
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 overflow-hidden">
                                        {contributor.image
                                            ? <img src={contributor.image} className="w-full h-full object-cover" />
                                            : contributor.name.charAt(0).toUpperCase()
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs font-semibold text-[var(--color-on-surface)] truncate">{contributor.name}</span>
                                            <span className="text-[10px] text-[var(--color-outline)] ml-2 shrink-0">{formatCount(contributor.message_count)}</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-[var(--color-surface-container-high)] overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-700"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomAnalytics;
