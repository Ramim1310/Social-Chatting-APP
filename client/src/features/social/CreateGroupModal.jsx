import useModalFocus from '../../components/common/useModalFocus';
import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function CreateGroupModal({ isOpen, onClose, user, onGroupCreated }) {
    const modalRef = useModalFocus(isOpen, onClose);
    const [groupName, setGroupName] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const toggleFriend = (friendId) => {
        if (selectedFriends.includes(friendId)) {
            setSelectedFriends(prev => prev.filter(id => id !== friendId));
        } else {
            setSelectedFriends(prev => [...prev, friendId]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            toast.error('Please enter a group name.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await api.post('/api/groups', {
                name: groupName,
                memberIds: selectedFriends
            });
            toast.success(`Group "${groupName}" created!`);
            onGroupCreated(res.data);
            setGroupName('');
            setSelectedFriends([]);
            onClose();
        } catch (err) {
            console.error(err);
            toast.error('Failed to create group.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Create a group" className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <Motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-[var(--color-surface-container-lowest)] rounded-3xl shadow-2xl border border-[var(--color-outline-variant)]/30 overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="px-6 py-5 border-b border-[var(--color-outline-variant)]/30 flex items-center justify-between bg-[var(--color-surface)]/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <span className="material-symbols-outlined font-medium">group_add</span>
                            </div>
                            <div>
                                <h3 className="font-display font-bold text-[var(--color-on-surface)] text-lg leading-tight">Create Group</h3>
                                <p className="text-xs text-[var(--color-on-surface-variant)] font-medium mt-0.5">Start a new group chat</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-400 hover:text-[var(--color-on-surface-variant)] transition-colors">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <form id="create-group-form" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-2">Group Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Weekend Warriors"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl border border-[var(--color-outline-variant)]/50 bg-[var(--color-surface)] focus:bg-[var(--color-surface-container-lowest)] focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/10 transition-all font-medium text-[var(--color-on-surface)] outline-none placeholder:text-slate-400"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-2">Invite Friends</label>
                                {user?.friends?.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {user.friends.map(friend => {
                                            const isSelected = selectedFriends.includes(friend.id);
                                            return (
                                                <button
                                                    key={friend.id}
                                                    type="button"
                                                    onClick={() => toggleFriend(friend.id)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'border-indigo-400 bg-indigo-50 shadow-sm' : 'border-[var(--color-outline-variant)]/30 hover:border-slate-300 hover:bg-[var(--color-surface)]'}`}
                                                >
                                                    {friend.image ? (
                                                        <img src={friend.image} className="w-10 h-10 rounded-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                                                            {friend.name.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 text-left">
                                                        <span className={`block text-sm font-bold ${isSelected ? 'text-indigo-900' : 'text-[var(--color-on-surface)]'}`}>{friend.name}</span>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'border-2 border-[var(--color-outline-variant)]/50'}`}>
                                                        {isSelected && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-[var(--color-surface)] text-center border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)] text-sm">
                                        You don't have any friends yet to invite to a group.
                                    </div>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="px-6 py-4 border-t border-[var(--color-outline-variant)]/30 bg-[var(--color-surface)] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl font-bold text-sm text-[var(--color-on-surface-variant)] hover:bg-slate-200/50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-group-form"
                            disabled={isSubmitting || !groupName.trim()}
                            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </Motion.div>
            </div>
        </AnimatePresence>
    );
}
