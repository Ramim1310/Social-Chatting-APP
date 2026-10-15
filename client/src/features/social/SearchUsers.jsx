import { useRef, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
export default function SearchUsers({ currentUser }) {
  const [query, setQuery] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentRequests, setSentRequests] = useState(new Set());
  const [sending, setSending] = useState(new Set());
  const requestRef = useRef(null);
  async function search(event) {
    event.preventDefault(); if (!query.trim()) return;
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    setLoading(true); setError(''); setSearchedQuery(query.trim());
    try { const { data } = await api.post('/api/users/search', { query: query.trim(), userId: currentUser.id }, { signal: controller.signal }); setResults(data.filter(person => person.id !== currentUser.id)); }
    catch (err) { if (err.code !== 'ERR_CANCELED') { setError('Search couldn’t connect. Try again.'); setResults([]); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  async function send(receiverId) {
    if (sending.has(receiverId)) return;
    setSending(previous => new Set(previous).add(receiverId));
    try { await api.post('/api/users/friend-request/send', { senderId: currentUser.id, receiverId }); setSentRequests(previous => new Set(previous).add(receiverId)); toast.success('A new connection is on its way!'); }
    catch (err) { toast.error(err.response?.data?.error || 'Couldn’t send your request.'); }
    finally { setSending(previous => { const next = new Set(previous); next.delete(receiverId); return next; }); }
  }
  return <div className="p-2 space-y-5"><p className="text-sm text-[var(--color-on-surface-variant)]">Find a familiar face. Start something good.</p>
    <form onSubmit={search} className="flex gap-2"><input type="search" aria-label="Search people" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name..." className="text-field min-w-0 flex-1"/><button type="submit" disabled={loading || !query.trim()} aria-label="Search people" className="primary-button px-3"><span aria-hidden="true" className="material-symbols-outlined">search</span></button></form>
    <div aria-live="polite" className="space-y-3">
      {loading && <p className="text-sm text-[var(--color-primary)] animate-pulse">Looking for your people...</p>}
      {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
      {!loading && !error && results.map(person => { const isFriend = currentUser.friends?.some(friend => friend.id === person.id); return <div key={person.id} className="flex items-center gap-3 rounded-2xl p-4 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40"><span className="avatar shrink-0">{person.image ? <img src={person.image} alt=""/> : person.name?.[0]?.toUpperCase()}</span><div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{person.name}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{isFriend ? 'Already in your circle' : 'Say hello'}</p></div>{isFriend || sentRequests.has(person.id) ? <span className="text-xs font-bold text-[var(--color-secondary)]">{isFriend ? 'Friends' : 'Sent'}</span> : <button onClick={() => send(person.id)} disabled={sending.has(person.id)} className="text-xs font-bold text-[var(--color-primary)] p-2 rounded-lg hover:bg-[var(--color-primary-fixed)]">{sending.has(person.id) ? 'Sending...' : 'Connect'}</button>}</div>; })}
      {!loading && !error && results.length === 0 && <div className="text-center py-10"><div className="empty-illustration"><span aria-hidden="true" className="material-symbols-outlined">person_search</span></div><p className="text-sm text-[var(--color-on-surface-variant)]">{searchedQuery ? 'No matches for "' + searchedQuery + '". Try another name.' : 'Search for someone you’d like to connect with.'}</p></div>}
    </div>
  </div>;
}
