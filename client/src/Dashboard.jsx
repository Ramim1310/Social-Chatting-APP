import React, { useState, useEffect } from "react";
import socket from "./socket";
import Sidebar from "./components/Sidebar";
import LiveThread from "./components/LiveThread";
import CommunityFeed from "./components/CommunityFeed";
import Settings from "./components/Settings";
import SearchUsers from "./components/SearchUsers";
import FriendRequests from "./components/FriendRequests";
import TypingIndicator from "./components/TypingIndicator";
import EmptyState from "./components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from './ThemeContext';

function Dashboard({ user, onLogout, refreshUser, initialTab = 'chats' }) {
  const { playSound, showNotification } = useTheme();
  const [username, setUsername] = useState(user?.name || "Anonymous");
  const [room, setRoom] = useState(localStorage.getItem('activeRoom') || "");
  const [chatName, setChatName] = useState(localStorage.getItem('activeChatName') || "");
  const getTabFromHash = () => {
    const hash = window.location.hash.replace(/^#\//, '');
    return ['chats', 'community', 'settings', 'search', 'requests'].includes(hash) ? hash : null;
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromHash() || initialTab);

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
  const [showChat, setShowChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false); 
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showDetailPane, setShowDetailPane] = useState(false);
  const messagesEndRef = React.useRef(null); 

  const queryClient = useQueryClient();

  const { data: messageList = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', room],
    queryFn: async () => {
      const { data } = await api.get(`/api/messages?room=${room}`);
      return data;
    },
    enabled: !!room,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: (newMessage) => {
      return api.post('/api/messages', newMessage);
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['messages', room] });
      const previousMessages = queryClient.getQueryData(['messages', room]);
      queryClient.setQueryData(['messages', room], (old) => [...(old || []), newMessage]);
      return { previousMessages };
    },
    onError: (err, newMessage, context) => {
      queryClient.setQueryData(['messages', room], (old) => {
          if (!old) return old;
          return old.map(m => (m.tempId === newMessage.tempId) ? { ...m, status: 'error' } : m);
      });
      console.error("Failed to send message", err);
    },
    onSuccess: (response, variables) => {
        const serverMessage = response.data;
        queryClient.setQueryData(['messages', room], (old) => {
            if (!old) return old;
            return old.map(m => (m.tempId === variables.tempId) ? { ...serverMessage, status: 'sent', tempId: variables.tempId } : m);
        });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messageList, isTyping]);


  const joinRoom = async (roomName, friendlyName = null) => {
    const r = roomName || room;
    if (username !== "" && r !== "") {
      socket.emit("join_room", r);
      if(!showChat) setShowChat(true);
      setRoom(r);
      setShowDetailPane(false);
      const name = friendlyName || r;
      setChatName(name);

      localStorage.setItem('activeRoom', r);
      localStorage.setItem('activeChatName', name);
    }
  };

  const startPrivateChat = (otherUser) => {
    const isFriend = user.friends?.some(f => f.id === otherUser.id);
    if (!isFriend) {
        toast.error("You can only chat with friends!");
        return;
    }
    const participants = [user.id, otherUser.id].sort((a,b) => a - b);
    const privateRoomId = `${participants[0]}-${participants[1]}`;
    joinRoom(privateRoomId, otherUser.name);
  };
 
  const sendMessage = async () => {
    if (message !== "") {
      const tempId = Date.now() + Math.random();
      const messageData = {
        room: room,
        author: username,
        content: message,
        email: user?.email,
        senderId: user?.id,
        image: user?.image || `https://ui-avatars.com/api/?name=${username}`,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
        isOptimistic: true,
        status: 'sending',
        tempId: tempId
      };

      mutation.mutate(messageData);
      
      setMessage("");
      handleStopTyping();
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (!isTyping) {
        setIsTyping(true);
        socket.emit("typing", room);
    }
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
      setIsTyping(false);
      socket.emit("stop_typing", room);
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
        toast.info(`New friend request from ${data.senderName}!`);
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

    socket.on("receive_message", handleReceiveMessage);
    socket.on("display_typing", handleDisplayTyping);
    socket.on("hide_typing", handleHideTyping);
    socket.on("active_users", handleActiveUsers);
    socket.on("friend_request_received", handleFriendRequest);
    socket.on("message_sent", handleMessageSent);
    socket.on("messages_seen", handleMessagesSeen);
    
    return () => {
        socket.off("receive_message", handleReceiveMessage);
        socket.off("display_typing", handleDisplayTyping);
        socket.off("hide_typing", handleHideTyping);
        socket.off("active_users", handleActiveUsers);
        socket.off("friend_request_received", handleFriendRequest);
        socket.off("message_sent", handleMessageSent);
        socket.off("messages_seen", handleMessagesSeen);
    }
  }, [socket, user, room, username, queryClient]); 

  useEffect(() => {
    if (user) {
        const persistedRoom = localStorage.getItem('activeRoom');
        const persistedName = localStorage.getItem('activeChatName');
        if (persistedRoom) {
            joinRoom(persistedRoom, persistedName || persistedRoom);
        } else {
            joinRoom('global_forum', 'Global Forum');
        }
    }
  }, [user]);

  useEffect(() => {
    if (room && user) {
        socket.emit('mark_messages_read', { room, userId: user.id });
    }
  }, [room, messageList, user]);

  return (
    <div className="flex bg-[var(--color-surface)] text-[var(--color-on-surface)] font-body h-screen w-full overflow-hidden selection:bg-[var(--color-primary-container)] selection:text-[var(--color-on-primary-container)]">
      <Toaster position="top-center" />

      {/* Full-screen Forum — hide chat chrome */}
      {activeTab === 'community' ? (
        <div className="w-full h-full overflow-hidden">
          <CommunityFeed user={user} onBack={() => setActiveTab('chats')} />
        </div>
      ) : activeTab === 'settings' ? (
        <div className="w-full h-full overflow-hidden flex">
          <Sidebar onLogout={onLogout} onTabChange={setActiveTab} activeTab={activeTab} />
          <Settings user={user} onUserUpdate={(updatedUser) => { refreshUser(updatedUser); }} />
        </div>
      ) : (
      <>
      {/* 3-Pane Layout Navigation Sidebar */}
      <Sidebar 
          onLogout={onLogout}
          onTabChange={setActiveTab}
          activeTab={activeTab}
          className="zen-hide"
      />
      
      {/* Main Content Area (Middle Pane + Right Pane) */}
      <main className="flex-grow flex flex-col md:flex-row h-full">
         
         {/* Middle Pane: Inbox List — hidden when a chat is active */}
         <section className={`w-full md:w-[420px] bg-[var(--color-surface)] flex flex-col z-10 border-r ghost-border zen-hide ${showChat && room ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--color-on-surface)]">
                        {activeTab === 'chats' ? 'Inbox' : activeTab === 'community' ? 'Forum' : activeTab === 'search' ? 'Search' : 'Requests'}
                    </h2>
                    {activeTab === 'chats' && (
                        <button className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center hover:bg-[var(--color-surface-container-high)] transition-colors">
                            <span className="material-symbols-outlined text-[var(--color-on-surface-variant)]">edit_square</span>
                        </button>
                    )}
                </div>

                {activeTab === 'chats' && (
                    <div className="relative">
                        <label className="block font-body text-xs font-semibold text-[var(--color-on-surface-variant)] mb-1 ml-1">Search conversations</label>
                        <div className="relative flex items-center group">
                            <span className="material-symbols-outlined absolute left-4 text-[var(--color-on-surface-variant)] group-focus-within:text-[var(--color-primary)] transition-colors">search</span>
                            <input className="w-full h-12 pl-12 pr-4 bg-[var(--color-surface-variant)] border-none outline-none rounded-xl focus:ring-1 focus:ring-[var(--color-primary)] focus:bg-[var(--color-surface-container-lowest)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50" placeholder="Find contacts or keywords..." type="text"/>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-grow overflow-y-auto px-4 space-y-2 pb-8 custom-scrollbar">
                {activeTab === 'chats' && (
                  <>
                     <h3 className="text-xs font-bold text-[var(--color-on-surface-variant)] mb-3 mt-4 uppercase tracking-widest px-2 font-display">Public Rooms</h3>
                     <div 
                        onClick={() => joinRoom('global_forum', 'Global Forum')}
                        className={`p-4 rounded-2xl transition-colors flex items-center gap-4 cursor-pointer group ${room === 'global_forum' ? 'bg-[var(--color-surface-container-lowest)] shadow-ambient' : 'hover:bg-[var(--color-surface-container-low)]'}`}
                     >
                        <div className="relative shrink-0">
                           <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${room === 'global_forum' ? 'cta-gradient text-[var(--color-on-primary)]' : 'bg-[var(--color-surface-container-high)] text-[var(--color-secondary-dim)]'}`}>
                              <span className="material-symbols-outlined">groups</span>
                           </div>
                        </div>
                        <div className="flex-grow min-w-0">
                           <div className="flex justify-between items-baseline mb-1">
                              <h3 className="font-display font-bold text-[var(--color-on-surface)] truncate">Global Forum</h3>
                              <span className="font-body text-[11px] text-[var(--color-on-surface-variant)]/60">Always Open</span>
                           </div>
                           <p className="text-sm text-[var(--color-on-surface-variant)] truncate">Join the public discussion!</p>
                        </div>
                     </div>

                     <h3 className="text-xs font-bold text-[var(--color-on-surface-variant)] mb-3 mt-6 uppercase tracking-widest px-2 font-display">Friends</h3>
                     {(!user.friends || user.friends.length === 0) ? (
                        <div className="p-4 rounded-xl border border-dashed border-[var(--color-outline-variant)] text-center mt-2">
                             <p className="text-sm text-[var(--color-on-surface-variant)]">No friends yet.</p>
                             <button onClick={() => setActiveTab('search')} className="text-xs text-[var(--color-primary)] font-bold mt-1 underline">Find people</button>
                        </div>
                     ) : (
                         user.friends.map((friend) => {
                             const isOnline = activeUsers.some(u => u.id === friend.id);
                             const isActiveChat = room.includes(friend.id);
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
         <section className={`flex-grow bg-[var(--color-surface)] flex-row relative overflow-hidden ${activeTab === 'community' ? 'flex' : 'hidden md:flex'}`}>
            <AnimatePresence mode="wait">
            {activeTab === 'community' ? (
               <motion.div 
                 key="community-feed"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="flex-1 h-full relative w-full"
               >
                  <CommunityFeed user={user} />
               </motion.div>
            ) : activeTab !== 'chats' ? (
               <motion.div 
                 key="empty-state"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="flex-1 h-full relative w-full"
               >
                 <EmptyState type={activeTab} />
               </motion.div>
            ) : (
                <motion.div 
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
                 <header className="h-20 bg-[var(--color-surface)]/80 custom-glass sticky top-0 z-50 flex justify-between items-center w-full px-8 shadow-[0_8px_24px_rgba(39,46,66,0.06)] border-b ghost-border">
                     <div className="flex items-center gap-4">
                         <div className="relative">
                            {room.includes('-') && user?.friends?.find(f => chatName === f.name)?.image ? (
                                <img src={user.friends.find(f => chatName === f.name).image} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-[var(--color-surface-container-low)]" />
                            ) : (
                                <div className="w-11 h-11 rounded-2xl bg-[var(--color-surface-container-high)] flex items-center justify-center font-bold text-[var(--color-on-surface)] ring-2 ring-[var(--color-surface-container-low)]">
                                    {chatName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {room.includes('-') && (
                                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface)] ${activeUsers.some(u => u.name === chatName) ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            )}
                         </div>
                         <div>
                             <h2 className="font-display text-lg font-black text-[var(--color-on-background)] tracking-tight">
                                {room.includes('-') ? (chatName || 'Private Chat') : `#${chatName || room}`}
                             </h2>
                             <div className="flex items-center gap-2">
                                 <p className="text-xs font-body text-[var(--color-on-surface-variant)]">{room.includes('-') ? 'User Profile' : 'Public Channel'}</p>
                                 {typingUsers.length > 0 && room.includes('-') && (
                                     <>
                                        <span className="w-1 h-1 bg-[var(--color-outline-variant)] rounded-full"></span>
                                        <p className="text-[10px] uppercase tracking-widest text-[var(--color-secondary)] font-bold">Typing...</p>
                                     </>
                                 )}
                             </div>
                         </div>
                     </div>
                     <div className="flex items-center gap-2">
                          <button className="p-2.5 rounded-xl hover:bg-[var(--color-surface-container-high)] transition-colors text-[var(--color-on-surface-variant)]">
                              <span className="material-symbols-outlined">search</span>
                          </button>
                          <button className="p-2.5 rounded-xl hover:bg-[var(--color-surface-container-high)] transition-colors text-[var(--color-on-surface-variant)]">
                              <span className="material-symbols-outlined">notifications</span>
                          </button>
                          <button
                            onClick={() => setShowDetailPane(p => !p)}
                            className={`p-2.5 rounded-xl transition-colors ${
                              showDetailPane
                                ? 'bg-[var(--color-primary-container)] text-[var(--color-primary)]'
                                : 'hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]'
                            }`}>
                              <span className="material-symbols-outlined">more_vert</span>
                          </button>
                      </div>
                 </header>

                 {/* Back button — visible on mobile when in chat */}
                 {room && (
                   <div className="flex md:hidden px-4 pt-3">
                     <button onClick={() => { setShowChat(false); setShowDetailPane(false); }}
                       className="flex items-center gap-1 text-xs text-[var(--color-primary)] font-bold">
                       <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Inbox
                     </button>
                   </div>
                 )}

                 {/* Message Stream */}
                 <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 scroll-smooth custom-scrollbar relative z-10">
                     
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

                     {!isMessagesLoading && (
                     <div className="flex justify-center">
                         <span className="px-4 py-1.5 rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] text-[10px] font-bold tracking-widest uppercase">Start of conversation</span>
                     </div>
                     )}
                     
                     {!isMessagesLoading && (<AnimatePresence>
                     {messageList.map((messageContent, index) => {
                       const isMe = (messageContent.sender?.name === username) || (messageContent.author === username);
                       const currentSender = messageContent.sender?.name || messageContent.author;
                       
                       return (
                           <motion.div
                               key={messageContent.id || messageContent.tempId || index}
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               className={`flex gap-4 max-w-2xl ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                           >
                               {!isMe ? (
                                   <div className="shrink-0">
                                       {messageContent.sender?.image || messageContent.image ? (
                                           <img src={messageContent.sender?.image || messageContent.image} className="w-8 h-8 rounded-lg mt-auto object-cover" />
                                       ) : (
                                           <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-variant)] mt-auto flex items-center justify-center text-[10px] font-bold text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]/10">
                                               {currentSender?.charAt(0).toUpperCase()}
                                           </div>
                                       )}
                                   </div>
                               ) : (
                                   <div className="shrink-0 flex items-end">
                                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-fixed)] mt-auto flex items-center justify-center text-[10px] font-black text-[var(--color-on-primary-fixed-variant)]">ME</div>
                                   </div>
                               )}
                               <div className={`space-y-2 ${isMe ? 'flex flex-col items-end' : ''}`}>
                                   {!isMe && !room.includes('-') && <span className="text-[10px] text-[var(--color-on-surface-variant)] ml-1 font-bold">{currentSender}</span>}
                                   
                                   <div className={`${isMe ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dim)] text-[var(--color-on-primary)] shadow-[0_8px_20px_rgba(74,64,224,0.15)] asymmetric-outgoing' : 'bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)] shadow-[0_4px_12px_rgba(39,46,66,0.03)] border border-[var(--color-outline-variant)]/5 asymmetric-incoming'} p-6 rounded-2xl`}>
                                        <p className="leading-relaxed font-body whitespace-pre-line break-words max-w-full text-sm">{messageContent.content}</p>
                                   </div>

                                   <div className={`flex items-center gap-1.5 ${isMe ? 'mr-0 justify-end' : 'ml-0'}`}>
                                        <span className="text-[10px] text-[var(--color-outline)] px-1">
                                             {messageContent.timestamp ? new Date(messageContent.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : messageContent.time}
                                        </span>
                                        {isMe && (
                                            <span className="flex items-center">
                                                {messageContent.status === 'seen' && (
                                                  <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 5.5L4.5 9L10 3" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <path d="M6 5.5L9.5 9L15 3" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                  </svg>
                                                )}
                                                {messageContent.status === 'sent' && (
                                                  <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M1 5.5L4.5 9L10 3" stroke="var(--color-outline-variant)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <path d="M6 5.5L9.5 9L15 3" stroke="var(--color-outline-variant)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                  </svg>
                                                )}
                                                {messageContent.status === 'sending' && <span className="text-[var(--color-on-surface-variant)]/50 text-xs animate-pulse">·</span>}
                                                {messageContent.status === 'error' && <span className="text-[var(--color-error)] text-xs">⚠</span>}
                                            </span>
                                        )}
                                    </div>
                               </div>
                           </motion.div>
                       )
                     })}
                     </AnimatePresence>)}
                     
                     <AnimatePresence>
                     {typingUsers.length > 0 && !room.includes('-') && ( /* Show in-feed typing only for group chats */
                         <motion.div 
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
                         </motion.div>
                     )}
                     {/* Self typing indicator — visible to the sender while composing */}
                     {isTyping && (
                         <motion.div
                             id="typing-indicator"
                             key="self-typing"
                             initial={{ opacity: 0, y: 6 }}
                             animate={{ opacity: 1, y: 0 }}
                             exit={{ opacity: 0 }}
                             className="flex gap-4 max-w-2xl ml-auto flex-row-reverse"
                         >
                             <div className="shrink-0 flex items-end">
                                 <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-fixed)] mt-auto flex items-center justify-center text-[10px] font-black text-[var(--color-on-primary-fixed-variant)]">ME</div>
                             </div>
                             <div className="flex flex-col items-end space-y-1">
                                 <div className="bg-gradient-to-br from-[var(--color-primary)]/70 to-[var(--color-primary-dim)]/70 px-5 py-3 rounded-2xl asymmetric-outgoing flex items-center gap-2 shadow-sm">
                                     <span className="flex gap-1 items-center">
                                         <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-on-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                         <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-on-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                         <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-on-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                                     </span>
                                     <span className="text-[10px] text-[var(--color-on-primary)]/80 font-semibold">You are typing...</span>
                                 </div>
                             </div>
                         </motion.div>
                     )}
                     </AnimatePresence>
                     <div ref={messagesEndRef} className="h-4" />
                 </div>

                 {/* Message Input Area (Floating Footer) */}
                 <footer className="p-6 md:p-8 shrink-0 bg-[var(--color-surface-container-low)]/50 custom-glass border-t border-[var(--color-outline-variant)]/10 z-20">
                     <div className="max-w-5xl mx-auto flex items-center gap-4">
                         <div className="flex items-center gap-1">
                             <button className="p-3 rounded-2xl hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-all">
                                 <span className="material-symbols-outlined">add_circle</span>
                             </button>
                             <button className="p-3 rounded-2xl hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] transition-all hidden sm:block">
                                 <span className="material-symbols-outlined">image</span>
                             </button>
                         </div>
                         <div className="flex-1 relative">
                             <input 
                                 id="message-input"
                                 className="w-full h-14 pl-6 pr-14 rounded-2xl bg-[var(--color-surface-container-lowest)] border-none ring-1 ring-[var(--color-outline-variant)]/20 focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none transition-all font-body text-[var(--color-on-surface)] placeholder:text-[var(--color-outline-variant)]" 
                                 placeholder="Type a thoughtful response..." 
                                 type="text"
                                 value={message}
                                 onChange={handleTyping}
                                 onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                             />
                             <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors hidden sm:block">
                                 <span className="material-symbols-outlined">sentiment_satisfied</span>
                             </button>
                         </div>
                         <button 
                             id="send-message-btn"
                             onClick={sendMessage}
                             disabled={!message.trim()}
                             className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dim)] text-[var(--color-on-primary)] flex items-center justify-center shadow-[0_12px_24px_rgba(74,64,224,0.25)] hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                         >
                             <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                         </button>
                     </div>
                     <div className="max-w-5xl mx-auto mt-4 px-1 flex items-center gap-2">
                         <div className="flex -space-x-2">
                             {user?.image ? (
                                <img src={user.image} className="w-5 h-5 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-surface-variant)] object-cover" />
                             ) : (
                                <div className="w-5 h-5 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-surface-variant)] overflow-hidden flex items-center justify-center text-[8px] font-black">{username.charAt(0)}</div>
                             )}
                             <div className="w-5 h-5 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-primary-fixed)] flex items-center justify-center text-xs font-black text-[var(--color-on-primary-fixed-variant)]"></div>
                         </div>
                         <p className="text-[10px] font-body text-[var(--color-on-surface-variant)]">Active in <span className="font-bold">{room.includes('-') ? (chatName || 'Private Chat') : `#${chatName || room}`}</span></p>
                     </div>
                 </footer>
               </div>
                           {/* Right Detail Pane — slide in from right on ⋮ click */}
               <AnimatePresence>
               {showDetailPane && room.includes('-') && (
                   <motion.aside
                     key="detail-pane"
                     initial={{ x: '100%', opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     exit={{ x: '100%', opacity: 0 }}
                     transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                     className="flex flex-col w-80 bg-[var(--color-surface-container-low)] border-l ghost-border p-8 space-y-8 z-30 shrink-0 overflow-y-auto custom-scrollbar"
                   >
                     {(() => {
                        const friend = user?.friends?.find(f => f.name === chatName);
                        const isOnline = activeUsers.some(u => u.name === chatName);
                        return (
                            <>
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
                   </motion.aside>
               )}
               </AnimatePresence>
               </motion.div>
             )}
              </AnimatePresence>
         </section>
      </main>
      </>
      )}
    </div>
  );
}

export default Dashboard;
