import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

function FriendRequests({ currentUser, onActionComplete }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!currentUser || !currentUser.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/api/users/friend-request/pending/${currentUser.id}`);
      setRequests(response.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const handleAction = async (requestId, action) => {
    try {
      const response = await api.post(`/api/users/friend-request/${action}`, { requestId });

      if (response.status === 200) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        toast.success(`Request ${action === 'accept' ? 'accepted' : 'declined'}!`);

        if (action === 'accept' && onActionComplete) {
          setTimeout(() => {
            onActionComplete();
          }, 500);
        }
      }
    } catch (error) {
      console.error(`Failed to ${action}`, error);
      toast.error(`Failed to ${action} request`);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <h3 className="text-[10px] font-bold text-[var(--color-on-surface-variant)] mb-4 px-2 uppercase tracking-widest">Pending Requests</h3>

      {loading && (
        <div className="text-[var(--color-primary)] text-center text-sm animate-pulse mt-4">Loading...</div>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)]/20 block mb-3">mark_email_read</span>
          <p className="text-sm text-[var(--color-on-surface-variant)]">No pending friend requests.</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {requests.map(req => (
          <div
            key={req.id}
            className="p-4 bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container-high)] rounded-2xl border border-[var(--color-outline-variant)]/20 transition-all duration-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              {req.sender?.image ? (
                <img src={req.sender.image} alt={req.sender.name} className="w-11 h-11 rounded-full object-cover border-2 border-[var(--color-primary)]/20" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] flex items-center justify-center text-[var(--color-on-primary)] font-bold text-base">
                  {req.sender?.name?.[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-[var(--color-on-surface)]">{req.sender?.name}</div>
                <div className="text-[11px] text-[var(--color-on-surface-variant)]">wants to be friends</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction(req.id, 'accept')}
                className="flex-1 py-2 bg-[var(--color-secondary)]/15 text-[var(--color-secondary)] border border-[var(--color-secondary)]/25 text-xs font-bold rounded-xl hover:bg-[var(--color-secondary)]/25 transition-all"
              >
                Accept
              </button>
              <button
                onClick={() => handleAction(req.id, 'reject')}
                className="flex-1 py-2 bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20 text-xs font-bold rounded-xl hover:bg-[var(--color-error)]/20 transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FriendRequests;
