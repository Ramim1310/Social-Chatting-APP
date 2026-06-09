import React from 'react';
import { motion } from 'framer-motion';

function WelcomeScreen({ name, onStart }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
      <div className="text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-6xl md:text-7xl font-black text-white mb-4 tracking-tighter"
        >
          {name} is in the house.
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-xl md:text-2xl text-gray-400 mb-12 font-medium"
        >
          Catch up on the latest or slide into the DMs.
        </motion.p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              onClick={() => onStart('chats')}
              className="px-8 py-4 bg-white text-black text-lg font-black rounded-tl-xl rounded-br-xl rounded-tr-sm rounded-bl-sm border-2 border-black shadow-[4px_4px_0_#4a40e0] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#4a40e0] transition-all duration-300 w-full md:w-auto uppercase tracking-wide"
            >
              Enter Chat
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              onClick={() => onStart('community')}
              className="px-8 py-4 bg-transparent border-2 border-white text-white text-lg font-black rounded-tl-sm rounded-br-sm rounded-tr-xl rounded-bl-xl hover:bg-white hover:text-black transition-all duration-300 w-full md:w-auto uppercase tracking-wide"
            >
              Explore
            </motion.button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
