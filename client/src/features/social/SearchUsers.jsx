import socket from '../../services/socket';
import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function SearchUsers({ currentUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState(new Set());

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await api.post('/api/users/search', { query, userId: currentUser.id });
      setResults(response.data);
    } catch (error) {
      console.error("Search failed", error);
      setResults([]);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = (receiverId) => {
    socket.emit('sendFriendRequest', {
      senderId: currentUser.id,
      receiverId
    }, (response) => {
      if (response.success) {
        setSentRequests(prev => new Set(prev).add(receiverId));
        toast.success("Friend request sent!");
      } else {
        toast.error(response.error || "Failed to send request");
      }
    });
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-[10px] font-bold text-[var(--color-on-surface-variant)] mb-4 px-2 uppercase tracking-widest">Find Friends</h3>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="flex-1 h-10 px-4 rounded-xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)] text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-xl font-bold text-sm hover:bg-[var(--color-primary-dim)] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
        </button>
      </form>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {loading && (
          <div className="text-[var(--color-primary)] text-center text-sm animate-pulse mt-4">Searching...</div>
        )}

        {results.map(user => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container-high)] rounded-xl border border-[var(--color-outline-variant)]/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-[var(--color-primary)]/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-primary)] font-bold text-sm">
                  {user.name[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-[var(--color-on-surface)]">{user.name}</div>
                <div className="text-[10px] text-[var(--color-on-surface-variant)]">{user.email}</div>
              </div>
            </div>

            {sentRequests.has(user.id) ? (
              <span className="text-[10px] text-[var(--color-secondary)] font-bold px-3 py-1 bg-[var(--color-secondary-container)]/20 rounded-full border border-[var(--color-secondary)]/20">Sent ✓</span>
            ) : (
              <button
                onClick={() => sendRequest(user.id)}
                className="px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] text-[var(--color-on-primary)] text-[11px] font-bold rounded-lg transition-all"
              >
                Add Friend
              </button>
            )}
          </div>
        ))}

        {results.length === 0 && !loading && query && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-[var(--color-on-surface-variant)]/30 block mb-2">person_search</span>
            <p className="text-sm text-[var(--color-on-surface-variant)]">No users found for "{query}"</p>
          </div>
        )}

        {results.length === 0 && !loading && !query && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)]/20 block mb-3">group_add</span>
            <p className="text-sm text-[var(--color-on-surface-variant)]">Search for users to add as friends</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchUsers;
