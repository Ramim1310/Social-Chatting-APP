import React from 'react';
import { motion } from 'framer-motion';

function EmptyState({ type }) {
  const config = {
    search: {
      icon: "🔍",
      title: "Find Your Friends",
      subtitle: "Search for people to connect with",
      description: "Use the search tab to discover and add friends. Start building your network!"
    },
    requests: {
      icon: "✉️",
      title: "Friend Requests",
      subtitle: "Manage your connections",
      description: "Check back here when you receive friend requests. Your pending requests will appear here!"
    },
    noChat: {
      icon: "💬",
      title: "No Chat Selected",
      subtitle: "Start a conversation",
      description: "Select a friend from your list or add new friends to start chatting!"
    }
  };

  const { icon, title, subtitle, description } = config[type] || config.noChat;

  return (
    <div className="flex-1 flex items-center justify-center h-full bg-black/20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center px-8 max-w-md"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-8xl mb-6 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]"
        >
          {icon}
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-3xl font-bold text-gray-100 mb-2 tracking-tight"
        >
          {title}
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-indigo-400 font-semibold mb-4 tracking-wide"
        >
          {subtitle}
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-slate-400 leading-relaxed max-w-sm mx-auto"
        >
          {description}
        </motion.p>

        {type === 'noChat' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-200 rounded-full shadow-lg backdrop-blur-sm">
              <span className="text-sm font-semibold">← Select a friend to start chatting</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default EmptyState;
