import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

const CATEGORIES = ['All Categories', 'Gaming', 'Sports', 'Movies', 'Anime', 'Politics'];

const CATEGORY_COLORS = {
  gaming: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', accent: 'border-blue-400', label: 'GAMING' },
  sports: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', accent: 'border-green-400', label: 'SPORTS' },
  anime:  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', accent: 'border-purple-400', label: 'ANIME' },
  movie:  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', accent: 'border-orange-400', label: 'MOVIES' },
  politics: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', accent: 'border-red-400', label: 'POLITICS' },
};

const CAT_COLOR_MAP = {
  GAMING: 'text-blue-600', SPORTS: 'text-green-600', ANIME: 'text-purple-600',
  MOVIES: 'text-orange-600', POLITICS: 'text-red-600',
};

const THREAD_BORDER = {
  gaming: 'border-blue-400', sports: 'border-green-400', anime: 'border-purple-400',
  movie: 'border-orange-400', politics: 'border-red-400', default: 'border-indigo-400',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name) { return name ? name.charAt(0).toUpperCase() : '?'; }

function getCatInfo(post) {
  const key = post.community?.name?.toLowerCase() || 'gaming';
  return CATEGORY_COLORS[key] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', accent: 'border-gray-400', label: (post.community?.name || 'GENERAL').toUpperCase() };
}

const THREAD_EMOJIS = ['🔥', '💬', '😮', '👍', '😂'];


function LiveThreadItem({ item }) {
  const catKey = item.category?.toLowerCase();
  const borderClass = THREAD_BORDER[catKey] || THREAD_BORDER.default;
  const catColor = CAT_COLOR_MAP[item.category?.toUpperCase()] || 'text-indigo-600';
  // Local reaction state: { emoji -> count }
  const [rxns, setRxns] = useState(() => ({
    '🔥': Math.floor(Math.random() * 15) + 1,
    '💬': Math.floor(Math.random() * 8),
    '😮': Math.floor(Math.random() * 6),
    '👍': Math.floor(Math.random() * 10),
    '😂': Math.floor(Math.random() * 4),
  }));
  const [picked, setPicked] = useState(null);

  const handleReact = (e, emoji) => {
    e.preventDefault();
    e.stopPropagation();
    setRxns(prev => {
      const next = { ...prev };
      if (picked === emoji) {
        next[emoji] = Math.max(0, next[emoji] - 1);
        setPicked(null);
      } else {
        if (picked) next[picked] = Math.max(0, next[picked] - 1);
        next[emoji] = (next[emoji] || 0) + 1;
        setPicked(emoji);
      }
      return next;
    });
  };

  return (
    <div className={`bg-white rounded-xl border-l-4 ${borderClass} border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow`}>
      <a href={item.link || '#'} target="_blank" rel="noopener noreferrer" className="block">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-[9px] font-black tracking-widest uppercase ${catColor}`}>{item.category?.toUpperCase()}</span>
          <span className="text-[9px] text-gray-400 font-semibold">· {timeAgo(item.pubDate)}</span>
        </div>
        <p className="text-xs font-semibold text-gray-800 leading-snug mb-1.5 line-clamp-2">{item.title}</p>
        {item.source && <p className="text-[10px] text-gray-400 truncate mb-2">{item.source}</p>}
      </a>
      {/* Reaction bar */}
      <div className="flex items-center gap-1 flex-wrap mt-2 pt-2 border-t border-gray-50">
        {THREAD_EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={(e) => handleReact(e, emoji)}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold transition-all border ${
              picked === emoji
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 scale-95'
                : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
            }`}
          >
            {emoji} {rxns[emoji] > 0 && <span>{rxns[emoji]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}


export default function CommunityFeed({ user, onBack }) {
  const [posts, setPosts] = useState([]);
  const [liveNews, setLiveNews] = useState([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [showExtended, setShowExtended] = useState(false);
  const [extendedNews, setExtendedNews] = useState([]);
  const [extendedLoading, setExtendedLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [communityName, setCommunityName] = useState('gaming');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const [commentInputs, setCommentInputs] = useState({});
  const [submittingCommentId, setSubmittingCommentId] = useState(null);

  const [activeCategory, setActiveCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [activeNav, setActiveNav] = useState('Trending');

  // Reactions: { [postId]: { liked: bool, count: number } }
  const [reactions, setReactions] = useState({});


  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get('/api/community/posts');
      setPosts(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchLiveNews = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await api.get('/api/community/news/live');
      setLiveNews(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const fetchExtendedNews = async () => {
    setExtendedLoading(true);
    try {
      const res = await api.get('/api/community/news/live?extended=true');
      setExtendedNews(res.data);
    } catch (e) { console.error(e); }
    finally { setExtendedLoading(false); }
  };

  useEffect(() => {
    fetchPosts();
    fetchLiveNews();
    // Refresh live news every 3 hours
    const interval = setInterval(fetchLiveNews, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPosts, fetchLiveNews]);


  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/api/community/posts/${postId}/like`);
      setReactions(prev => ({ ...prev, [postId]: { liked: res.data.liked, count: res.data.count } }));
    } catch (e) { console.error(e); }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in both the title and content.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/api/community/posts', { title, content, communityName });
      toast.success('Post published! 🎉');
      setTitle(''); setContent(''); setShowCreatePost(false);
      fetchPosts();
      setTimeout(fetchPosts, 3500);
    } catch (err) {
      console.error('Post creation failed:', err);
      const msg = err.response?.data?.error || 'Failed to publish post. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleCommentSubmit = async (e, postId) => {
    e.preventDefault();
    const cmt = commentInputs[postId];
    if (!cmt?.trim()) return;
    setSubmittingCommentId(postId);
    try {
      await api.post(`/api/community/posts/${postId}/comments`, { content: cmt });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (err) {
      console.error('Comment failed:', err);
      toast.error('Failed to post comment. Please try again.');
    } finally {
      setSubmittingCommentId(null);
    }
  };


  const filteredPosts = posts.filter(post =>
    activeCategory === 'All Categories' ||
    post.community?.name?.toLowerCase() === activeCategory.toLowerCase()
  );

  const displayedNews = showExtended ? extendedNews : liveNews;

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2fa] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-center" toastOptions={{ style: { fontFamily: "'Inter', sans-serif", fontSize: '13px' } }} />


      <header className="h-[60px] bg-white shrink-0 flex items-center justify-between px-6 border-b border-gray-100 z-50 shadow-sm">
        <button onClick={onBack} className="flex items-center gap-1 group shrink-0">
          <span className="text-[#4a40e0] font-black text-xl tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>NEXUS</span>
        </button>
        <nav className="hidden md:flex items-center gap-6">
          {['Gaming', 'Sports', 'Movies', 'Anime', 'Politics'].map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`text-sm font-semibold pb-1 transition-all ${activeCategory === cat ? 'text-[#4a40e0] border-b-2 border-[#4a40e0]' : 'text-gray-500 hover:text-gray-800'}`}>
              {cat}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-400">
            <span className="material-symbols-outlined text-[18px]">search</span>
            <span className="hidden sm:block">Search NEXUS...</span>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><span className="material-symbols-outlined">notifications</span></button>
          <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><span className="material-symbols-outlined">settings</span></button>
          {user?.image
            ? <img src={user.image} className="w-9 h-9 rounded-full object-cover border-2 border-[#4a40e0]" />
            : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4a40e0] to-[#9795ff] flex items-center justify-center text-white font-bold text-sm">{getInitials(user?.name)}</div>
          }
        </div>
      </header>


      <div className="flex flex-1 overflow-hidden">


        <aside className="hidden md:flex flex-col w-[200px] bg-white shrink-0 border-r border-gray-100 py-6 px-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4a40e0] to-[#9795ff] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
            </div>
            <div>
              <p className="font-black text-[#4a40e0] text-sm leading-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>NEXUS</p>
              <p className="text-[9px] text-gray-400 tracking-widest uppercase">Community</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 relative">
            {[
              { label: 'Home', icon: 'home' },
              { label: 'Trending', icon: 'trending_up' },
              { label: 'Communities', icon: 'group' },
              { label: 'Saved', icon: 'bookmark' },
            ].map(item => (
              <button key={item.label}
                onClick={() => {
                  if (item.label === 'Home') { onBack(); return; }
                  setActiveNav(item.label);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${activeNav === item.label ? 'bg-[#eef0ff] text-[#4a40e0]' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <button onClick={() => setShowCreatePost(true)}
            className="mt-4 w-full py-3 px-4 rounded-tl-xl rounded-br-xl rounded-tr-sm rounded-bl-sm border-2 border-[var(--color-on-surface)] bg-[var(--color-primary)] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[4px_4px_0_var(--color-on-surface)] hover:translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Post
          </button>

          <div className="mt-6 space-y-1 pt-4 border-t border-gray-100">
            {['Help', 'Privacy'].map(item => (
              <button key={item} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <span className="material-symbols-outlined text-[16px]">help_outline</span>{item}
              </button>
            ))}
          </div>
        </aside>


        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 py-6 custom-scrollbar min-w-0">
          {/* Feed Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Manrope', sans-serif" }}>Community Feed</h1>
            <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-gray-100 shadow-sm">
              {['NEWEST', 'TOP'].map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${sortBy === s ? 'bg-[#eef0ff] text-[#4a40e0]' : 'text-gray-400 hover:text-gray-700'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 custom-scrollbar">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${activeCategory === cat ? 'bg-[#4a40e0] text-white border-[#4a40e0]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#4a40e0] hover:text-[#4a40e0]'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* Create Post Modal */}
          <AnimatePresence>
            {showCreatePost && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Create Post</h2>
                  <button onClick={() => setShowCreatePost(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex gap-3">
                    <select value={communityName} onChange={e => setCommunityName(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4a40e0]">
                      <option value="gaming">🎮 Gaming</option>
                      <option value="sports">🏅 Sports</option>
                      <option value="anime">⛩️ Anime</option>
                      <option value="movie">🎬 Movies</option>
                      <option value="politics">🗳️ Politics</option>
                    </select>
                    <input type="text" placeholder="Thread Title..." value={title} onChange={e => setTitle(e.target.value)}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4a40e0]" />
                  </div>
                  <textarea placeholder="Spill the tea..." value={content} onChange={e => setContent(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4a40e0] min-h-[100px] resize-none custom-scrollbar" />
                  <div className="flex justify-end">
                    <button type="submit" disabled={isSubmitting || !title.trim() || !content.trim()}
                      className="px-6 py-2.5 rounded-tl-xl rounded-br-xl rounded-tr-sm rounded-bl-sm border-2 border-black bg-[var(--color-primary)] text-white font-bold text-sm shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:translate-x-1 active:translate-x-0 active:translate-y-0 transition-all disabled:opacity-50 disabled:transform-none">
                      {isSubmitting ? 'Publishing...' : 'Publish Post'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Posts */}
          <div className="space-y-4">
            <AnimatePresence>
              {filteredPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-40">forum</span>
                  <p className="font-semibold">No posts in this category yet.</p>
                  <button onClick={() => setShowCreatePost(true)} className="mt-3 text-[#4a40e0] text-sm font-bold hover:underline">Kick things off →</button>
                </div>
              )}
              {filteredPosts.map((post, idx) => {
                const catInfo = getCatInfo(post);
                const rxn = reactions[post.id] || { liked: false, count: 0 };
                return (
                  <motion.div key={post.id}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`bg-white rounded-2xl border-l-4 ${catInfo.accent} border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 md:p-6`}>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {post.author?.image
                          ? <img src={post.author.image} className="w-10 h-10 rounded-full object-cover" />
                          : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4a40e0] to-[#9795ff] flex items-center justify-center text-white font-bold text-sm">{getInitials(post.author?.name)}</div>
                        }
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{post.author?.name}</span>
                          <span className="text-gray-400 text-xs ml-2">@{(post.author?.name || 'user').toLowerCase().replace(/\s+/g, '_')} · {timeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${catInfo.bg} ${catInfo.text} ${catInfo.border}`}>{catInfo.label}</span>
                    </div>

                    {/* Title & Content */}
                    <h2 className="text-xl font-black text-gray-900 mb-2 leading-snug" style={{ fontFamily: "'Manrope', sans-serif" }}>{post.title}</h2>
                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-4">{post.content}</p>

                    {/* Reactions Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 mb-3">
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${rxn.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: rxn.liked ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                          <span className="font-semibold">{rxn.count}</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-gray-400 hover:text-[#4a40e0] transition-colors text-sm">
                          <span className="material-symbols-outlined text-[18px]">chat_bubble_outline</span>
                          <span className="font-semibold">{post.comments?.length || 0}</span>
                        </button>
                      </div>
                      <button className="text-gray-400 hover:text-[#4a40e0] transition-colors">
                        <span className="material-symbols-outlined text-[18px]">share</span>
                      </button>
                    </div>

                    {/* Comments (System Agent / AI insight comments hidden) */}
                    {post.comments?.filter(c => c.author?.name !== 'System Agent').length > 0 && (
                      <div className="bg-gray-50/50 border-t border-gray-100 p-4 mt-3 rounded-xl space-y-3">
                        {post.comments
                          .filter(c => c.author?.name !== 'System Agent')
                          .map(comment => {
                          const isMe = user?.name === comment.author?.name;
                          return (
                            <div key={comment.id} className={`flex gap-3 items-start ${isMe ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                                isMe ? 'bg-gradient-to-br from-[#4a40e0] to-[#9795ff] text-white' : 'bg-gray-200 text-gray-600'
                              }`}>{getInitials(comment.author?.name)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-xs font-bold ${isMe ? 'text-[#4a40e0]' : 'text-gray-700'}`}>
                                    {isMe ? 'You' : comment.author?.name}
                                  </span>
                                  <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                                </div>
                                <p className={`text-xs leading-relaxed p-2.5 rounded-xl ${isMe ? 'bg-[#eef0ff] text-[#4a40e0]' : 'bg-gray-50 text-gray-600'}`}>
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Comment Input */}
                    <form onSubmit={(e) => handleCommentSubmit(e, post.id)} className="mt-3 flex items-center gap-2">
                      <input type="text" placeholder="Write a comment..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="flex-1 h-9 rounded-full bg-gray-50 border border-gray-200 px-4 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4a40e0] transition-all" />
                      <button type="submit" disabled={submittingCommentId === post.id || !(commentInputs[post.id] || '').trim()}
                        className="w-9 h-9 shrink-0 rounded-full bg-[#4a40e0] flex items-center justify-center text-white hover:bg-[#3d30d4] transition-colors disabled:opacity-40">
                        {submittingCommentId === post.id
                          ? <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                          : <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        }
                      </button>
                    </form>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </main>


        <aside className="hidden lg:flex flex-col w-1/4 shrink-0 py-6 px-4 overflow-y-auto custom-scrollbar bg-transparent gap-3">
          {/* Header with blinking red dot */}
          <div className="flex items-center gap-2 px-1 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <h3 className="font-black text-gray-900 text-base" style={{ fontFamily: "'Manrope', sans-serif" }}>Live Thread</h3>
          </div>

          {/* News items */}
          {liveLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                  <div className="h-2 w-16 bg-gray-100 rounded mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded mb-1"></div>
                  <div className="h-3 w-4/5 bg-gray-100 rounded"></div>
                </div>
              ))}
            </div>
          ) : displayedNews.length > 0 ? (
            <div className="flex flex-col gap-3">
              {displayedNews.map((item, i) => <LiveThreadItem key={item.id || i} item={item} />)}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-xs">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">newspaper</span>
              Nothing happening yet. Check back later.
            </div>
          )}

          {/* Show More */}
          {!showExtended ? (
            <button
              onClick={async () => { setShowExtended(true); await fetchExtendedNews(); }}
              className="mt-2 w-full py-2.5 rounded-xl border border-[#4a40e0] text-[#4a40e0] font-semibold text-xs hover:bg-[#eef0ff] transition-colors flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
              Show More (Past 24 Hours)
            </button>
          ) : extendedLoading ? (
            <div className="text-center py-2 text-xs text-gray-400 animate-pulse">Loading extended feed...</div>
          ) : (
            <button onClick={() => { setShowExtended(false); setExtendedNews([]); }}
              className="mt-2 w-full py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 transition-colors flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[16px]">expand_less</span>
              Show Less
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
