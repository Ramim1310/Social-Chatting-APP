import React, { useState, useEffect, lazy, Suspense } from "react";
import socket from "../services/socket";
import Sidebar from "../components/common/Sidebar";
import Home from "../components/common/Home";
import Dialog from "../components/common/Dialog";
import { getRecentConversations, rememberConversation } from '../services/conversationHistory';
import CommunityFeed from "../features/community/CommunityFeed";
import Settings from "../components/common/Settings";
import SearchUsers from "../features/social/SearchUsers";
import FriendRequests from "../features/social/FriendRequests";
import TypingIndicator from "../features/chat/TypingIndicator";
import EmptyState from "../components/common/EmptyState";
import PollMessage from "../features/chat/PollMessage";
import CreatePollModal from "../features/chat/CreatePollModal";
import CreateGroupModal from "../features/social/CreateGroupModal";
import SearchModal from "../features/chat/SearchModal";
import MobileNav from "../components/common/MobileNav";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/useTheme';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const DecisionNodeEditor = lazy(() => import('../features/chat/DecisionNodeEditor'));
const RoomAnalytics = lazy(() => import('../features/chat/RoomAnalytics'));

// ── Markdown renderer with custom styled components ──────────────────────────
const MarkdownContent = ({ content, isMe }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="leading-relaxed whitespace-pre-wrap break-words text-sm">{children}</p>,
      strong: ({ children }) => <strong className="font-bold">{children}</strong>,
      em: ({ children }) => <em className="italic">{children}</em>,
      blockquote: ({ children }) => (
        <blockquote className={`border-l-2 pl-3 my-1 italic text-sm ${isMe ? 'border-purple-300 text-purple-100' : 'border-gray-300 text-gray-500'
          }`}>{children}</blockquote>
      ),
      pre: ({ children }) => <pre className="font-mono text-xs bg-slate-950 text-slate-100 p-3 rounded-xl my-2 overflow-x-auto">{children}</pre>,
      code: ({ children }) => <code>{children}</code>,
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className={`underline underline-offset-2 ${isMe ? 'text-purple-200 hover:text-white' : 'text-purple-600 hover:text-purple-800'
            }`}>{children}</a>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

// ── Hover action button ───────────────────────────────────────────────────────
const ActionBtn = ({ icon, label, onClick, danger = false }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={`p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold ${danger
        ? 'text-red-500 hover:bg-red-50'
        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
  >
    <span className="material-symbols-outlined text-[16px]">{icon}</span>
  </button>
);

function Dashboard({ user, onLogout, refreshUser, initialTab = 'home' }) {
  const { playSound, showNotification } = useTheme();
  const username = user?.name || "Anonymous";
  const [recentConversations, setRecentConversations] = useState(() => getRecentConversations(user.id));
  const [savedConversation] = useState(() => getRecentConversations(user.id)[0]);
  const [room, setRoom] = useState(savedConversation?.room || "");
  const [chatName, setChatName] = useState(savedConversation?.name || "");
  const isPrivateRoom = /^\d+-\d+$/.test(room);
  const getTabFromHash = () => {
    const hash = window.location.hash.replace(/^#\//, '');
    return ['home', 'chats', 'community', 'settings', 'search', 'requests'].includes(hash) ? hash : null;
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromHash() || (savedConversation ? 'chats' : initialTab));

  useEffect(() => {
    if (window.location.hash !== `#/${activeTab}`) {
      window.location.hash = `#/${activeTab}`;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hashTab = getTabFromHash();
      if (hashTab && hashTab !== activeTab) {
        setActiveTab(hashTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(!!savedConversation);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showDetailPane, setShowDetailPane] = useState(false);
  const [showDecisionNode, setShowDecisionNode] = useState(false);

  const [polls, setPolls] = useState([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  const [showSearch, setShowSearch] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);

  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [inboxSearch, setInboxSearch] = useState('');
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = React.useRef(null);
  const followMessagesRef = React.useRef(true);
  const messageInputRef = React.useRef(null);
  const matchesInbox = name => name.toLowerCase().includes(inboxSearch.trim().toLowerCase());

  useEffect(() => {
    if (user) {
      api.get('/api/groups')
        .then(res => setGroups(res.data))
        .catch(console.error);
    }
  }, [user]);

  const messagesEndRef = React.useRef(null);


  // replyingTo: the message object the user is replying to (null = no active reply)
  const [replyingTo, setReplyingTo] = useState(null);
  // editingId: id of the message currently being edited (null = none)
  const [editingId, setEditingId] = useState(null);

  const handleReply = (msg) => { setEditingId(null); setReplyingTo(msg); messageInputRef.current?.focus(); };
  const cancelReply = () => setReplyingTo(null);

  const handleDeleteMessage = async () => {
    if (!pendingDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/messages/${pendingDelete.id}`);
      queryClient.setQueryData(['messages', pendingDelete.room], old => old?.filter(item => item.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success('Message deleted');
    } catch { toast.error('Couldn’t delete the message. Please try again.'); }
    finally { setIsDeleting(false); }
  };

  const handleEditMessage = (msg) => {
    setEditingId(msg.id);
    setReplyingTo(null);
    setMessage(msg.content); // pre-fill input with current content
    messageInputRef.current?.focus();
  };

  const queryClient = useQueryClient();

  const { data: messageList = [], isLoading: isMessagesLoading, isError: messagesError, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', room],
    queryFn: async () => {
      const { data } = await api.get('/api/messages', { params: { room } });
      return data;
    },
    enabled: !!room,
    staleTime: 30000,
  });

  const mutation = useMutation({
    mutationFn: (newMessage) => {
      return api.post('/api/messages', newMessage);
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['messages', newMessage.room] });
      
      queryClient.setQueryData(['messages', newMessage.room], (old) => [...(old || []).filter(item => item.tempId !== newMessage.tempId), { ...newMessage, status: 'sending' }]);
      
    },
    onError: (err, newMessage) => {
      queryClient.setQueryData(['messages', newMessage.room], (old) => {
        if (!old) return old;
        return old.map(m => (m.tempId === newMessage.tempId) ? { ...m, status: 'error' } : m);
      });
      console.error("Failed to send message", err);
      toast.error('Message not sent. Tap Retry below the message.');
    },
    onSuccess: (response, variables) => {
      const serverMessage = response.data;
      queryClient.setQueryData(['messages', variables.room], (old) => {
        if (!old) return old;
        return old.map(m => (m.tempId === variables.tempId) ? { ...serverMessage, status: 'sent', tempId: variables.tempId } : m);
      });
    },
  });

  useEffect(() => {
    if (followMessagesRef.current) messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [messageList, typingUsers.length, activeTab]);

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);


  const joinRoom = async (roomName, friendlyName = null) => {
    const r = roomName || room;
    if (username !== "" && r !== "") {
      if (room) { socket.emit('stop_typing', room); socket.emit('leave_room', room); }
      clearTimeout(typingTimeoutRef.current);
      followMessagesRef.current = true;
      setIsTyping(false);
      setTypingUsers([]);
      setMessage('');
      setEditingId(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      setShowDecisionNode(false);
      setShowAnalytics(false);
      socket.emit("join_room", r);
      if (!showChat) setShowChat(true);
      setRoom(r);
      setShowDetailPane(false);
      const name = friendlyName || r;
      setChatName(name);

      setRecentConversations(rememberConversation(user.id, r, name));
    }
  };

  const startPrivateChat = (otherUser) => {
    const isFriend = user.friends?.some(f => f.id === otherUser.id);
    if (!isFriend) {
      toast.error("You can only chat with friends!");
      return;
    }
    const participants = [user.id, otherUser.id].sort((a, b) => a - b);
    const privateRoomId = `${participants[0]}-${participants[1]}`;
    joinRoom(privateRoomId, otherUser.name);
    setActiveTab('chats');
  };

  const sendMessage = async () => {
    if (message.trim() && room && !editMutation.isPending) {
      if (editingId) {
        editMutation.mutate({ id: editingId, room, content: message.trim() });
        return;
      }
      const tempId = crypto.randomUUID();
      const messageData = {
        room: room,
        author: username,
        content: replyingTo ? `> Reply to ${replyingTo.sender?.name || replyingTo.author || 'a message'}\n> ${(replyingTo.content || '').split('\n').join('\n> ')}\n\n${message.trim()}` : message.trim(),
        email: user?.email,
        senderId: user?.id,
        image: user?.image,
        timestamp: new Date().toISOString(),
        isOptimistic: true,
        status: 'sending',
        tempId: tempId,
      };

      followMessagesRef.current = true;
      mutation.mutate(messageData);
      setMessage("");
      setReplyingTo(null); // clear reply banner after send
      setEditingId(null);
      handleStopTyping();
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing", room);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    setIsTyping(false);
    socket.emit("stop_typing", room);
  };

  const editMutation = useMutation({
    mutationFn: ({ id, content }) => api.patch(`/api/messages/${id}`, { content }),
    onSuccess: ({ data }, variables) => {
      queryClient.setQueryData(['messages', variables.room], old => old?.map(item => item.id === data.id ? data : item));
      if (variables.room === room) { setEditingId(null); setMessage(''); handleStopTyping(); }
      toast.success('Message updated');
    },
    onError: () => toast.error('Couldn’t save your edit. Your text is still here.'),
  });

  const openInbox = () => {
    handleStopTyping();
    if (room) socket.emit('leave_room', room);
    clearTimeout(typingTimeoutRef.current);
    setShowChat(false); setShowDetailPane(false); setShowDecisionNode(false); setShowAnalytics(false);
    setRoom(''); setReplyingTo(null); setEditingId(null); setMessage(''); setActiveTab('chats');
  };

  useEffect(() => {
    if (user) {
      socket.emit('user_connected', user);
    }

    const handleReceiveMessage = (data) => {
      if (data.room !== room) return;
      queryClient.setQueryData(['messages', room], (old) => {
        if (!old) return [data];
        const exists = old.find(m => (m.id && m.id === data.id) || (m.tempId && m.tempId === data.tempId));
        if (exists) return old;
        return [...old, data];
      });
      // Play sound + browser notification for incoming messages (not own)
      const senderName = data.sender?.name || data.author || '';
      if (senderName !== username) {
        playSound();
        showNotification(`${senderName}`, data.content?.slice(0, 80));
      }
    };

    const handleDisplayTyping = (userId) => {
      setTypingUsers((prev) => [...new Set([...prev, userId])]);
    };

    const handleHideTyping = (userId) => {
      setTypingUsers((prev) => prev.filter(id => id !== userId));
    };

    const handleActiveUsers = (users) => {
      const unique = Array.from(new Map(users.map(u => [u.email, u])).values());
      setActiveUsers(unique);
    };

    const handleFriendRequest = (data) => {
      toast(`New friend request from ${data.senderName}!`);
      queryClient.invalidateQueries({ queryKey: ['pendingRequests', user.id] });
    };

    const handleMessageSent = (data) => {
      queryClient.setQueryData(['messages', room], (old) => {
        if (!old) return old;
        return old.map(m => (m.tempId === data.tempId) ? { ...m, ...data } : m);
      });
    };

    const handleMessagesSeen = ({ room: r }) => {
      if (room === r) {
        queryClient.setQueryData(['messages', room], (old) => {
          if (!old) return old;
          return old.map(m =>
            (m.sender?.name === username || m.author === username) ? { ...m, status: 'seen' } : m
          );
        });
      }
    };

    const handlePollCreated = (poll) => {
      setPolls(prev => [poll, ...prev.filter(p => p.id !== poll.id)]);
    };
    const handlePollUpdated = (poll) => {
      setPolls(prev => prev.map(p => p.id === poll.id ? poll : p));
    };

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('user_connected', user);
      if (room) { socket.emit('join_room', room); queryClient.invalidateQueries({ queryKey: ['messages', room] }); }
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleMessageUpdated = data => { if (data.room === room) queryClient.setQueryData(['messages', room], old => old?.map(item => item.id === data.id ? data : item)); };
    const handleMessageDeleted = data => { if (data.room === room) queryClient.setQueryData(['messages', room], old => old?.filter(item => item.id !== data.id)); };
    const connectedTimer = setTimeout(() => setIsConnected(socket.connected), 0);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("display_typing", handleDisplayTyping);
    socket.on("hide_typing", handleHideTyping);
    socket.on("active_users", handleActiveUsers);
    socket.on("friend_request_received", handleFriendRequest);
    socket.on("message_sent", handleMessageSent);
    socket.on("messages_seen", handleMessagesSeen);
    socket.on("poll_created", handlePollCreated);
    socket.on("poll_updated", handlePollUpdated);

    return () => {
      clearTimeout(connectedTimer);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("display_typing", handleDisplayTyping);
      socket.off("hide_typing", handleHideTyping);
      socket.off("active_users", handleActiveUsers);
      socket.off("friend_request_received", handleFriendRequest);
      socket.off("message_sent", handleMessageSent);
      socket.off("messages_seen", handleMessagesSeen);
      socket.off("poll_created", handlePollCreated);
      socket.off("poll_updated", handlePollUpdated);
    }
  }, [user, room, username, queryClient, playSound, showNotification]);

  useEffect(() => {
    if (savedConversation) {
      socket.emit('join_room', savedConversation.room);
    }
  }, [savedConversation]);

  useEffect(() => {
    if (room && user) {
      socket.emit('mark_messages_read', { room, userId: user.id });
    }
  }, [room, messageList, user]);

  // Load polls whenever room changes
  useEffect(() => {
    if (!room) return;
    setPolls([]);
    api.get(`/api/messages/polls/${room}`)
      .then(res => setPolls(res.data))
      .catch(() => {});
  }, [room]);

  // CMD+K to open search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app-shell flex flex-col md:flex-row bg-[var(--color-surface)] text-[var(--color-on-surface)] font-body w-full overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '14px', background: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface)', border: '1px solid var(--color-outline-variant)' } }} />
      <Sidebar user={user} onLogout={onLogout} onTabChange={setActiveTab} onCompose={openInbox} activeTab={activeTab} />

      {/* Keep primary navigation in place while the page content changes. */}
      {activeTab === 'home' ? (
        <>
          <Home
            user={user}
            recentConversations={recentConversations}
            groups={groups}
            onNavigate={setActiveTab}
            onOpenConversation={({ room: nextRoom, name }) => {
              joinRoom(nextRoom, name);
              setActiveTab('chats');
            }}
            onStartPrivateChat={startPrivateChat}
          />
        </>
      ) : activeTab === 'community' ? (
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <CommunityFeed user={user} />
        </div>
      ) : activeTab === 'settings' ? (
        <div className="flex-1 min-w-0 h-full overflow-hidden flex">
          <Settings user={user} onLogout={onLogout} onUserUpdate={(updatedUser) => { refreshUser(updatedUser); }} />
        </div>
      ) : (
        <>
          {/* Main Content Area (Middle Pane + Right Pane) */}
          <main className="flex-grow min-w-0 flex flex-col md:flex-row h-full">

            {/* Middle Pane: Inbox List — hidden when a chat is active */}
            <section className={`w-full md:w-[420px] bg-[var(--color-surface)] flex flex-col z-10 border-r ghost-border ${showChat && room && activeTab === 'chats' ? 'hidden' : 'flex'}`}>
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">
                    {activeTab === 'chats' ? 'Inbox' : activeTab === 'community' ? 'Forum' : activeTab === 'search' ? 'Search' : 'Requests'}
                  </h2>
                  {activeTab === 'chats' && (
                    <div className="flex gap-2">
                      <button onClick={() => setShowCreateGroup(true)} className="px-3 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-sm flex items-center gap-1 hover:bg-[var(--color-primary)]/20 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">group_add</span> Create
                      </button>
                      <button onClick={() => setActiveTab('search')} aria-label="Find a friend to message" className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center hover:bg-[var(--color-surface-container-high)] transition-colors">
                        <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">edit_square</span>
                      </button>
                    </div>
                  )}
                </div>

                {activeTab === 'chats' && (
                  <div className="relative">
                    <label className="block font-body text-xs font-semibold text-[var(--color-on-surface-variant)] mb-1 ml-1">Jump to...</label>
                    <div className="relative flex items-center group">
                      <span className="material-symbols-outlined absolute left-4 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">search</span>
                      <input value={inboxSearch} onChange={event => setInboxSearch(event.target.value)} aria-label="Filter conversations" className="w-full h-12 pl-12 pr-4 bg-[var(--color-surface-variant)] border-none outline-none rounded-xl focus:ring-1 focus:ring-[var(--color-primary)] focus:bg-[var(--color-surface-container-lowest)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50" placeholder="Find a friend or group…" type="search" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-grow overflow-y-auto px-4 space-y-2 pb-8 custom-scrollbar">
                {activeTab === 'chats' && (
                  <>
                    {inboxSearch.trim() && !matchesInbox('Public Square') && !groups.some(group => matchesInbox(group.name)) && !(user.friends || []).some(friend => matchesInbox(friend.name)) && <div role="status" className="text-center p-5 text-sm text-[var(--color-on-surface-variant)]"><p>No conversations match that name.</p><button onClick={() => setInboxSearch('')} className="text-[var(--color-primary)] font-bold mt-2">Clear search</button></div>}
                    <h3 className="text-xs font-bold text-[var(--color-on-surface-variant)] mb-3 mt-4 uppercase tracking-widest px-2 font-display">Public Rooms</h3>
                    {matchesInbox('Public Square') && <button
                      onClick={() => joinRoom('global_forum', 'Public Square')}
                      className={`w-full text-left p-4 rounded-2xl transition-colors flex items-center gap-4 cursor-pointer group ${room === 'global_forum' ? 'bg-[var(--color-surface-container-lowest)] shadow-ambient' : 'hover:bg-[var(--color-surface-container-low)]'}`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${room === 'global_forum' ? 'cta-gradient text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-container-high)] text-[var(--color-secondary-dim)]'}`}>
                          <span className="material-symbols-outlined">groups</span>
                        </div>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-display font-bold text-[var(--color-on-surface)] truncate">Public Square</h3>
                          <span className="font-body text-[11px] text-[var(--color-on-surface-variant)]/60">Always Open</span>
                        </div>
                        <p className="text-sm text-[var(--color-on-surface-variant)] truncate">Join the public discussion!</p>
                      </div>
                    </button>}

                    {groups.length > 0 && (
                      <>
                        <h3 className="text-xs font-bold text-[var(--color-on-surface-variant)] mb-3 mt-6 uppercase tracking-widest px-2 font-display">Your Groups</h3>
                        {groups.filter(group => matchesInbox(group.name)).map(group => (
                          <div
                            key={group.id}
                            onClick={() => joinRoom(`group-${group.id}`, group.name)}
                            className={`p-4 rounded-2xl transition-colors flex items-center gap-4 cursor-pointer group ${room === `group-${group.id}` ? 'bg-[var(--color-surface-container-lowest)] shadow-ambient' : 'hover:bg-[var(--color-surface-container-low)]'}`}
                          >
                            <div className="relative shrink-0">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${room === `group-${group.id}` ? 'cta-gradient text-[var(--color-on-primary)]' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                                <span className="material-symbols-outlined font-bold">workspaces</span>
                              </div>
                            </div>
                            <div className="flex-grow min-w-0">
                              <h3 className="font-display font-bold text-[var(--color-on-surface)] truncate">{group.name}</h3>
                              <p className="text-sm text-[var(--color-on-surface-variant)] truncate">{group.members?.length || 0} members</p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    <h3 className="text-xs font-bold text-[var(--color-on-surface-variant)] mb-3 mt-6 uppercase tracking-widest px-2 font-display">Friends</h3>
                    {(!user.friends || user.friends.length === 0) ? (
                      <div className="p-4 rounded-xl border border-dashed border-[var(--color-outline-variant)] text-center mt-2">
                        <p className="text-sm text-[var(--color-on-surface-variant)]">No friends yet.</p>
                        <button onClick={() => setActiveTab('search')} className="text-xs text-[var(--color-primary)] font-bold mt-1 underline">Find people</button>
                      </div>
                    ) : (
                      user.friends.filter(friend => matchesInbox(friend.name)).map((friend) => {
                        const isOnline = activeUsers.some(u => u.id === friend.id);
                        const isActiveChat = room === [user.id, friend.id].sort((a, b) => a - b).join('-');
                        return (
                          <div
                            key={friend.id}
                            onClick={() => startPrivateChat(friend)}
                            className={`p-4 rounded-2xl transition-colors flex items-center gap-4 cursor-pointer group relative overflow-hidden ${isActiveChat ? 'bg-[var(--color-surface-container-lowest)] shadow-[0_8px_24px_rgba(39,46,66,0.06)]' : 'hover:bg-[var(--color-surface-container-low)]'}`}
                          >
                            {isActiveChat && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-[var(--color-secondary)] rounded-r-full"></div>}
                            <div className="relative shrink-0">
                              {friend.image ? (
                                <img src={friend.image} alt={friend.name} className={`w-14 h-14 rounded-full object-cover border-2 transition-all duration-300 ${isOnline ? 'border-[var(--color-secondary)]' : 'border-transparent grayscale group-hover:grayscale-0'}`} />
                              ) : (
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-[var(--color-on-surface)] text-bold text-xl relative shadow-ambient ghost-border bg-[var(--color-surface-variant)]`}>
                                  {friend.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {isOnline && <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-4 border-[var(--color-surface-container-lowest)]"></div>}
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="flex justify-between items-baseline mb-1">
                                <h3 className="font-display font-bold text-[var(--color-on-surface)] truncate">{friend.name}</h3>
                                {isOnline && <span className="font-body text-[11px] font-medium text-[var(--color-primary)]">Online</span>}
                              </div>
                              <p className="text-sm text-[var(--color-on-surface-variant)] truncate">Click to start chatting</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
                {activeTab === 'search' && <SearchUsers currentUser={user} />}
                {activeTab === 'requests' && <FriendRequests currentUser={user} onActionComplete={refreshUser} />}
              </div>
            </section>

            {/* Right Pane: Chat Interface + Details Feature */}
            <section className={`flex-grow bg-[var(--color-surface)] flex-col md:flex-row relative overflow-hidden ${activeTab === 'community' || (activeTab === 'chats' && showChat && room) ? 'flex' : 'hidden md:flex'}`}>
              <AnimatePresence mode="wait">
                {activeTab === 'community' ? (
                  <Motion.div
                    key="community-feed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 h-full relative w-full"
                  >
                    <CommunityFeed user={user} />
                  </Motion.div>
                ) : activeTab !== 'chats' || !room || !showChat ? (
                  <Motion.div
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 h-full relative w-full"
                  >
                    <EmptyState type={activeTab === 'chats' ? 'noChat' : activeTab} />
                  </Motion.div>
                ) : (
                  <Motion.div
                    key="chat-interface"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex w-full h-full relative"
                  >

                    <div className="flex-1 flex flex-col h-full relative bg-[var(--color-surface)] min-w-0">
                      {/* Decorative element */}
                      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-[var(--color-primary)]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                      {/* Top App Bar from Active Conversation */}
                      <header className="chat-header bg-[var(--color-surface-container-lowest)]/90 custom-glass sticky top-0 z-40 flex justify-between items-center w-full border-b ghost-border">
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={openInbox}
                            className="p-2 -ml-3 rounded-xl hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-colors"
                            title="Back to Inbox"
                          >
                            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                          </button>
                          <div className="relative">
                            {isPrivateRoom && user?.friends?.find(f => chatName === f.name)?.image ? (
                              <img src={user.friends.find(f => chatName === f.name).image} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[var(--color-surface-container-low)]" />
                            ) : (
                              <div className="w-11 h-11 rounded-2xl bg-[var(--color-surface-container-high)] flex items-center justify-center font-bold text-[var(--color-on-surface)] ring-2 ring-[var(--color-surface-container-low)]">
                                {chatName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {isPrivateRoom && (
                              <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface)] ${activeUsers.some(u => u.name === chatName) ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            )}
                          </div>
                          <div>
                            <h2 className="font-display text-lg font-black text-[var(--color-on-background)] tracking-tight">
                              {isPrivateRoom ? (chatName || 'Private Chat') : `#${chatName || room}`}
                            </h2>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-body text-[var(--color-on-surface-variant)]">{isPrivateRoom ? 'User Profile' : 'Public Channel'}</p>
                              {typingUsers.length > 0 && isPrivateRoom && (
                                <>
                                  <span className="w-1 h-1 bg-[var(--color-outline-variant)] rounded-full"></span>
                                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-secondary)] font-bold">Typing...</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setShowDecisionNode(!showDecisionNode)}
                            title="Collaborative Notes"
                            className={`p-2.5 rounded-xl transition-colors ${showDecisionNode ? 'bg-emerald-500/15 text-emerald-600' : 'hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]'}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">edit_document</span>
                          </button>
                          <button 
                            onClick={() => setShowCreatePoll(true)}
                            title="Create Poll"
                            className="p-2.5 rounded-xl hover:bg-[var(--color-surface-container-high)] transition-colors text-[var(--color-on-surface-variant)]"
                          >
                            <span className="material-symbols-outlined text-[20px]">how_to_vote</span>
                          </button>
                          <button
                            onClick={() => setShowAnalytics(p => !p)}
                            title="Room Analytics"
                            className={`p-2.5 rounded-xl transition-colors ${showAnalytics ? 'bg-purple-500/15 text-purple-600' : 'hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]'}`}
                          >
                            <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                          </button>
                          <button 
                            onClick={() => setShowSearch(true)}
                            title="Search Messages (Ctrl+K)"
                            className="p-2.5 rounded-xl hover:bg-[var(--color-surface-container-high)] transition-colors text-[var(--color-on-surface-variant)]"
                          >
                            <span className="material-symbols-outlined">search</span>
                          </button>
                          <button
                            onClick={() => setShowDetailPane(p => !p)}
                            className={`p-2.5 rounded-xl transition-colors ${showDetailPane
                                ? 'bg-[var(--color-primary-container)] text-[var(--color-primary)]'
                                : 'hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]'
                              }`}>
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </div>
                      </header>

                      {/* Message Stream */}
                      {!isConnected && <p role="status" className="status-banner">Reconnecting… Your messages will sync when you’re back online.</p>}
                      <div onScroll={event => { const node = event.currentTarget; followMessagesRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120; }} className="message-stream flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar relative z-10">
                        {messagesError && <div role="alert" className="text-center p-6"><p className="text-sm mb-3">Couldn’t load this conversation.</p><button onClick={() => refetchMessages()} className="text-sm text-[var(--color-primary)] font-bold">Try again</button></div>}

                        {/* ── Loading skeleton ── */}
                        {isMessagesLoading && (
                          <div className="space-y-8 py-4">
                            {[...Array(5)].map((_, i) => (
                              <div key={i} className={`flex gap-4 max-w-2xl ${i % 2 === 0 ? '' : 'ml-auto flex-row-reverse'}`}>
                                <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-container-high)] animate-pulse shrink-0 mt-auto" />
                                <div className="space-y-2 flex-1">
                                  {i % 2 === 0 && <div className="h-2.5 w-16 rounded-full bg-[var(--color-surface-container-high)] animate-pulse" />}
                                  <div className={`h-12 rounded-2xl bg-[var(--color-surface-container-high)] animate-pulse ${i % 2 === 0 ? 'w-3/4' : 'w-2/3'}`}
                                    style={{ animationDelay: `${i * 80}ms` }}
                                  />
                                  <div className="h-2 w-12 rounded-full bg-[var(--color-surface-container-high)] animate-pulse" style={{ animationDelay: `${i * 80 + 40}ms` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* ── Polls section ── */}
                        {polls.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-outline)] flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[12px]">how_to_vote</span>
                              Active Polls
                            </p>
                            {polls.map(poll => (
                              <PollMessage key={poll.id} poll={poll} currentUserId={user?.id} />
                            ))}
                            <div className="border-b border-[var(--color-outline-variant)]/20 my-4" />
                          </div>
                        )}

                        {!isMessagesLoading && (
                          <div className="flex justify-center">
                            <span className="px-4 py-1.5 rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] text-[10px] font-bold tracking-widest uppercase">Start of conversation</span>
                          </div>
                        )}

                        {!isMessagesLoading && (<AnimatePresence>
                          {messageList.map((messageContent, index) => {
                            const isMe = (messageContent.senderId === user.id) || (messageContent.sender?.id === user.id);
                            const currentSender = messageContent.sender?.name || messageContent.author;
                            // Feature 3: check if the sender is currently online
                            const senderIsOnline = activeUsers.some(u => u.name === currentSender);

                            return (
                              // Feature 1: group class enables hover-based action menu visibility
                              <Motion.div
                                key={messageContent.id || messageContent.tempId || index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`group relative flex gap-4 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                              >
                                {/* ── Avatar with online status dot (Feature 3) ── */}
                                {!isMe ? (
                                  <div className="shrink-0 relative">
                                    {messageContent.sender?.image || messageContent.image ? (
                                      <img src={messageContent.sender?.image || messageContent.image} className="w-8 h-8 rounded-lg mt-auto object-cover" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-variant)] mt-auto flex items-center justify-center text-[10px] font-bold text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]/10">
                                        {currentSender?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    {/* Online status dot */}
                                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${senderIsOnline ? 'bg-green-500' : 'bg-gray-400'
                                      }`} />
                                  </div>
                                ) : (
                                  <div className="shrink-0 flex items-end">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-fixed)] mt-auto flex items-center justify-center text-[10px] font-black text-[var(--color-on-primary-fixed-variant)]">ME</div>
                                  </div>
                                )}

                                {/* ── Message body ── */}
                                <div className={`space-y-1.5 ${isMe ? 'flex flex-col items-end' : ''}`}>
                                  {!isMe && !isPrivateRoom && <span className="text-[10px] text-[var(--color-on-surface-variant)] ml-1 font-bold">{currentSender}</span>}

                                  {/* Feature 2: quoted reply preview above the bubble */}
                                  {messageContent.replyTo && (
                                    <div className={`flex items-start gap-1.5 px-3 py-1.5 rounded-xl max-w-xs ${isMe ? 'bg-purple-800/40 border-l-2 border-purple-300' : 'bg-gray-100 border-l-2 border-gray-300'
                                      }`}>
                                      <span className="material-symbols-outlined text-[13px] shrink-0 mt-0.5 text-gray-400">reply</span>
                                      <div className="min-w-0">
                                        <p className={`text-[10px] font-bold mb-0.5 ${isMe ? 'text-purple-200' : 'text-gray-500'}`}>
                                          {messageContent.replyTo.author}
                                        </p>
                                        <p className={`text-xs truncate ${isMe ? 'text-purple-200/70' : 'text-gray-500'}`}>
                                          {messageContent.replyTo.content}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* ── Bubble + hover actions wrapper ── */}
                                  <div className="relative flex items-center gap-2">

                                    {/* Feature 1: Action menu — appears on hover, left of bubble for sender, right for receiver */}
                                    {isMe && (
                                      <div className="message-actions flex flex-col items-center gap-0.5 shrink-0">
                                        <ActionBtn icon="reply" label="Reply" onClick={() => handleReply(messageContent)} />
                                        {messageContent.id && <ActionBtn icon="edit" label="Edit" onClick={() => handleEditMessage(messageContent)} />}
                                        {messageContent.id && <ActionBtn icon="delete" label="Delete" onClick={() => setPendingDelete(messageContent)} danger />}
                                      </div>
                                    )}

                                    <div className={`${isMe
                                        ? 'bg-[var(--action-bg)] text-white border-0 asymmetric-outgoing'
                                        : 'bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] shadow-sm border border-[var(--color-outline-variant)]/50 asymmetric-incoming'
                                      } message-bubble px-5 py-3.5 rounded-2xl max-w-sm`}>
                                      {/* Feature 4: Markdown rendering */}
                                      <MarkdownContent content={messageContent.content} isMe={isMe} />
                                    </div>

                                    {/* Action menu for receiver messages (right side) */}
                                    {!isMe && (
                                      <div className="message-actions flex items-center gap-0.5 shrink-0">
                                        <ActionBtn icon="reply" label="Reply" onClick={() => handleReply(messageContent)} />
                                      </div>
                                    )}
                                  </div>

                                  {messageContent.status === 'error' && <button className="text-xs font-bold text-[var(--color-error)]" onClick={() => mutation.mutate(messageContent)}>Not sent - Retry</button>}
                                  {/* Timestamp + delivery ticks */}
                                  <div className={`flex items-center gap-1.5 ${isMe ? 'mr-0 justify-end' : 'ml-0'}`}>
                                    <span className="text-[10px] text-[var(--color-outline)] px-1">
                                      {messageContent.timestamp ? new Date(messageContent.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : messageContent.time}
                                    </span>
                                    {isMe && (
                                      <span className="flex items-center">
                                        {messageContent.status === 'seen' && (
                                          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 5.5L4.5 9L10 3" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 5.5L9.5 9L15 3" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                        {messageContent.status === 'sent' && (
                                          <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 5.5L4.5 9L10 3" stroke="var(--color-outline-variant)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 5.5L9.5 9L15 3" stroke="var(--color-outline-variant)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )}
                                        {messageContent.status === 'sending' && <span className="text-[var(--color-on-surface-variant)]/50 text-xs animate-pulse">·</span>}
                                        {messageContent.status === 'error' && <span className="text-[var(--color-error)] text-xs">⚠</span>}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </Motion.div>
                            )
                          })}
                        </AnimatePresence>)}

                        <AnimatePresence>
                          {typingUsers.length > 0 && !isPrivateRoom && ( /* Show in-feed typing only for group chats */
                            <Motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex gap-4 max-w-2xl"
                            >
                              <div className="space-y-2">
                                <div className="bg-[var(--color-surface-container-lowest)] asymmetric-incoming p-4 rounded-2xl shadow-sm flex items-center gap-2 border border-[var(--color-outline-variant)]/5">
                                  <TypingIndicator />
                                  <span className="text-[10px] text-[var(--color-on-surface-variant)] ml-2">Someone is typing...</span>
                                </div>
                              </div>
                            </Motion.div>
                          )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} className="h-4" />
                      </div>

                      {/* Message Input Area (Floating Footer) */}
                      <footer className="chat-composer shrink-0 z-20">
                        {editingId && <div className="status-banner flex justify-between gap-3"><span>Editing your message</span><button onClick={() => { setEditingId(null); setMessage(''); }} className="font-bold">Cancel edit</button></div>}

                        {/* Feature 2: Reply banner — visible when replyingTo is set */}
                        <AnimatePresence>
                          {replyingTo && (
                            <Motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 6 }}
                              className="mx-6 md:mx-8 mt-4 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-primary-fixed)] border border-[var(--color-primary)]/20"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-purple-500 text-[16px] shrink-0">reply</span>
                                <span className="text-xs font-bold text-[var(--color-primary)] shrink-0">Replying to {replyingTo.sender?.name || replyingTo.author}</span>
                                <span className="text-xs text-[var(--color-primary)] truncate">{replyingTo.content}</span>
                              </div>
                              <button onClick={cancelReply} className="shrink-0 text-purple-400 hover:text-purple-700 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </Motion.div>
                          )}
                        </AnimatePresence>

                        <div className="p-3 sm:p-5">
                          <div className="max-w-5xl mx-auto flex items-end gap-2 sm:gap-3 relative">
                            <button onClick={() => setShowEmojiPicker(value => !value)} aria-label="Add an emoji" aria-expanded={showEmojiPicker} className="icon-button mb-1"><span aria-hidden="true" className="material-symbols-outlined">sentiment_satisfied</span></button>
                            {showEmojiPicker && <div role="group" aria-label="Choose an emoji" className="absolute bottom-full left-0 mb-3 rounded-2xl p-3 bg-[var(--color-surface-container-lowest)] shadow-xl border border-[var(--color-outline-variant)] grid grid-cols-6 gap-1 z-30">{["😊","😂","❤️","🎉","🔥","🙌","✨","👋","💜","🤔","👍","🚀"].map(emoji => <button key={emoji} aria-label={emoji} onClick={() => { setMessage(value => value + emoji); setShowEmojiPicker(false); messageInputRef.current?.focus(); }} className="w-10 h-10 text-xl rounded-xl hover:bg-[var(--color-surface-container-low)]">{emoji}</button>)}</div>}
                            <textarea ref={messageInputRef} id="message-input" aria-label={editingId ? 'Edit your message' : 'Write a message'} className="text-field resize-none min-w-0 flex-1 min-h-12 max-h-32" rows={2} placeholder={replyingTo ? 'Write your reply...' : 'Say something nice...'} value={message} onChange={handleTyping} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } if (event.key === 'Escape') { setShowEmojiPicker(false); setReplyingTo(null); setEditingId(null); } }} />
                            <button id="send-message-btn" onClick={sendMessage} disabled={!message.trim() || editMutation.isPending} aria-label={editingId ? 'Save message' : 'Send message'} className="primary-button icon-only shrink-0 mb-1"><span aria-hidden="true" className="material-symbols-outlined">{editingId ? 'check' : 'arrow_upward'}</span></button>
                          </div>
                          <p className="hidden sm:block text-[10px] text-[var(--color-on-surface-variant)] text-center mt-2">Enter to send / Shift + Enter for a new line / A little kindness goes a long way</p>
                          <div className="max-w-5xl mx-auto mt-3 px-1 flex items-center gap-2">
                            <div className="flex -space-x-2">
                              {user?.image ? (
                                <img src={user.image} className="w-5 h-5 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-surface-variant)] object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-surface-variant)] overflow-hidden flex items-center justify-center text-[8px] font-black">{username.charAt(0)}</div>
                              )}
                              <div className="w-5 h-5 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-primary-fixed)] flex items-center justify-center text-xs font-black text-[var(--color-on-primary-fixed-variant)]"></div>
                            </div>
                            <p className="text-[10px] font-body text-[var(--color-on-surface-variant)]">Active in <span className="font-bold">{isPrivateRoom ? (chatName || 'Private Chat') : `#${chatName || room}`}</span></p>
                          </div>
                        </div>
                      </footer>
                    </div>
                    {/* Right Detail Pane — slide in from right on ⋮ click */}
                    <AnimatePresence>
                      {showDetailPane && isPrivateRoom && (
                        <Motion.aside
                          key="detail-pane"
                          initial={{ x: '100%', opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          exit={{ x: '100%', opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          className="room-panel flex flex-col w-80 bg-[var(--color-surface-container-low)] border-l ghost-border p-8 space-y-8 z-30 shrink-0 overflow-y-auto custom-scrollbar"
                        >
                          {(() => {
                            const friend = user?.friends?.find(f => f.name === chatName);
                            const isOnline = activeUsers.some(u => u.name === chatName);
                            return (
                              <>
                                <button onClick={() => setShowDetailPane(false)} aria-label="Close details" className="icon-button self-end"><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
                                <div className="text-center space-y-4">
                                  <div className="relative inline-block">
                                    {friend?.image ? (
                                      <img src={friend.image} className="w-32 h-32 rounded-[2rem] object-cover shadow-xl" />
                                    ) : (
                                      <div className="w-32 h-32 rounded-[2rem] bg-[var(--color-surface-container-high)] ghost-border flex items-center justify-center text-5xl font-black text-[var(--color-on-surface)] shadow-md">
                                        {chatName?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    {isOnline && <div className="absolute bottom-1 right-1 w-6 h-6 bg-[var(--color-secondary)] border-4 border-[var(--color-surface-container-low)] rounded-full"></div>}
                                  </div>
                                  <div>
                                    <h3 className="font-display text-xl font-black text-[var(--color-on-surface)] tracking-tight">{chatName}</h3>
                                    <p className="text-sm font-body text-[var(--color-on-surface-variant)]">Member</p>
                                  </div>
                                </div>
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] mb-3">Professional Bio</h4>
                                    <p className="text-xs font-body text-[var(--color-on-surface)] leading-relaxed">Connected to the NEXUS network. Chatting &amp; sharing ideas in the community.</p>
                                  </div>
                                  <div>
                                    <h4 className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] mb-3">Recent Artifacts</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="aspect-square rounded-lg bg-gradient-to-tr from-indigo-100 to-indigo-200 border border-[var(--color-outline-variant)]/20"></div>
                                      <div className="aspect-square rounded-lg bg-gradient-to-bl from-teal-50 to-teal-100 border border-[var(--color-outline-variant)]/20"></div>
                                      <div className="aspect-square rounded-lg bg-[var(--color-surface-container-high)] flex items-center justify-center text-[var(--color-primary)] border border-[var(--color-outline-variant)]/20 hover:bg-[var(--color-surface-variant)] transition-all cursor-pointer">
                                        <span className="material-symbols-outlined">add</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-4 space-y-3">
                                    <button className="w-full py-3 px-4 rounded-xl bg-[var(--color-surface-container-lowest)] ghost-border text-[var(--color-on-surface)] font-semibold text-xs flex items-center justify-between hover:bg-[var(--color-surface-container-high)] transition-colors">
                                      <span className="flex items-center gap-3"><span className="material-symbols-outlined text-[var(--color-secondary)]">history</span> Thread History</span>
                                      <span className="material-symbols-outlined text-[var(--color-outline)]">chevron_right</span>
                                    </button>
                                    <button className="w-full py-3 px-4 rounded-xl bg-[var(--color-surface-container-lowest)] ghost-border text-[var(--color-on-surface)] font-semibold text-xs flex items-center justify-between hover:bg-[var(--color-surface-container-high)] transition-colors">
                                      <span className="flex items-center gap-3"><span className="material-symbols-outlined text-[var(--color-secondary)]">share</span> Shared Assets</span>
                                      <span className="material-symbols-outlined text-[var(--color-outline)]">chevron_right</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="mt-auto p-5 rounded-2xl bg-[var(--color-error-container)]/10 border border-[var(--color-error-container)]/5">
                                  <button className="w-full flex items-center gap-3 text-[var(--color-error)] font-bold text-xs hover:text-[var(--color-error-container)] transition-colors">
                                    <span className="material-symbols-outlined">block</span>
                                    Flag for Review
                                  </button>
                                </div>
                              </>
                            )
                          })()}
                        </Motion.aside>
                      )}
                    </AnimatePresence>
                  </Motion.div>
                )}
              </AnimatePresence>
              
              {/* Collaborative Decision Node Pane */}
              <AnimatePresence>
                {showDecisionNode && room && (
                  <Suspense fallback={<div role="status" className="p-6 text-sm">Opening your shared notes…</div>}><DecisionNodeEditor
                    room={room} 
                    user={user} 
                    onClose={() => setShowDecisionNode(false)} 
                  /></Suspense>
                )}
              </AnimatePresence>

              {/* Room Analytics Pane */}
              <AnimatePresence>
                {showAnalytics && room && (
                  <Motion.aside
                    key="analytics-pane"
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="room-panel w-80 shrink-0 border-l border-[var(--color-outline-variant)]/30 bg-[var(--color-surface)] flex flex-col h-full z-40 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-[var(--color-outline-variant)]/20 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-violet-500/10 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                          <span className="material-symbols-outlined text-purple-600 text-[18px]">bar_chart</span>
                        </div>
                        <div>
                          <h2 className="font-display font-bold text-[var(--color-on-surface)] text-sm leading-tight">Analytics</h2>
                          <p className="text-[10px] text-[var(--color-on-surface-variant)]">Last 30 days</p>
                        </div>
                      </div>
                      <button onClick={() => setShowAnalytics(false)} className="p-1.5 hover:bg-[var(--color-surface-container-high)] rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-on-surface-variant)]">close</span>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <Suspense fallback={<div role="status" className="p-6 text-sm">Gathering room activity…</div>}><RoomAnalytics room={room} /></Suspense>
                    </div>
                  </Motion.aside>
                )}
              </AnimatePresence>

            </section>
          </main>

          {/* ── Global Modals ────────────────────────────────────────────── */}
          <AnimatePresence>
            {showCreatePoll && (
              <CreatePollModal
                room={room}
                onClose={() => setShowCreatePoll(false)}
                onCreated={(poll) => setPolls(prev => [poll, ...prev])}
              />
            )}
          </AnimatePresence>

          <CreateGroupModal
            isOpen={showCreateGroup}
            onClose={() => setShowCreateGroup(false)}
            user={user}
            onGroupCreated={(newGroup) => {
              setGroups([newGroup, ...groups]);
              joinRoom(`group-${newGroup.id}`, newGroup.name);
            }}
          />
        </>
      )}

      {pendingDelete && <Dialog title="Delete this message?" onClose={() => { if (!isDeleting) setPendingDelete(null); }}><p className="text-sm text-[var(--color-on-surface-variant)] mb-5">This removes your message for everyone in the conversation.</p><div className="flex justify-end gap-3"><button onClick={() => setPendingDelete(null)} disabled={isDeleting} className="px-4 py-2 text-sm font-bold">Keep it</button><button onClick={handleDeleteMessage} disabled={isDeleting} className="primary-button danger-button">{isDeleting ? 'Deleting...' : 'Delete message'}</button></div></Dialog>}
      <AnimatePresence>{showSearch && <SearchModal currentRoom={room} onClose={() => setShowSearch(false)} />}</AnimatePresence>
      {/* Mobile Navigation Bar */}
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default Dashboard;
