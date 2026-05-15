import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CreatePollModal = ({ room, onClose, onCreated }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const addOption = () => {
        if (options.length < 6) setOptions(prev => [...prev, '']);
    };

    const removeOption = (idx) => {
        if (options.length <= 2) return;
        setOptions(prev => prev.filter((_, i) => i !== idx));
    };

    const updateOption = (idx, value) => {
        setOptions(prev => prev.map((o, i) => (i === idx ? value : o)));
    };

    const handleSubmit = async () => {
        const filledOptions = options.map(o => o.trim()).filter(Boolean);
        if (!question.trim()) return toast.error('Please enter a question.');
        if (filledOptions.length < 2) return toast.error('At least 2 options required.');

        setIsSubmitting(true);
        try {
            const { data } = await api.post('/api/messages/polls', {
                question: question.trim(),
                options: filledOptions,
                room,
            });
            onCreated(data);
            onClose();
            toast.success('Poll created!');
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create poll.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-[var(--color-surface)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-[var(--color-outline-variant)]/20 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-violet-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-500 text-[20px]">how_to_vote</span>
                        </div>
                        <div>
                            <h3 className="font-display font-bold text-[var(--color-on-surface)] text-sm">Create a Poll</h3>
                            <p className="text-[10px] text-[var(--color-on-surface-variant)]">Results update in real-time</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-surface-container-high)] rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Question */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block mb-2">
                            Question
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="What do you want to ask?"
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-[var(--color-outline)]"
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] block mb-2">
                            Options ({options.length}/6)
                        </label>
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={e => updateOption(idx, e.target.value)}
                                        placeholder={`Option ${idx + 1}`}
                                        className="flex-1 px-4 py-2 rounded-xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30 text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-[var(--color-outline)]"
                                    />
                                    {options.length > 2 && (
                                        <button onClick={() => removeOption(idx)} className="p-1.5 text-[var(--color-on-surface-variant)] hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-[16px]">remove_circle</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 6 && (
                            <button onClick={addOption} className="mt-2 flex items-center gap-1.5 text-xs text-purple-500 hover:text-purple-600 font-semibold transition-colors">
                                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                Add option
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--color-outline-variant)]/20 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm font-bold hover:from-purple-600 hover:to-violet-700 transition-all disabled:opacity-50 shadow-md"
                    >
                        {isSubmitting ? 'Creating...' : 'Create Poll'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CreatePollModal;
