import React, { useState } from 'react';

function Sidebar({ onLogout, onTabChange, activeTab = 'chats', className = '' }) {
  const handleTabChange = (tab) => {
    if (onTabChange) onTabChange(tab);
  };

  return (
    <aside className={`h-screen w-72 left-0 top-0 sticky bg-[var(--color-surface-container-low)] flex flex-col py-8 px-6 space-y-8 z-40 transition-all ease-in-out duration-300 border-r ghost-border shrink-0 hidden md:flex ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] flex items-center justify-center shadow-lg shrink-0">
          <span className="material-symbols-outlined text-[var(--color-on-primary)]" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display font-black text-[var(--color-primary)] tracking-tight truncate text-lg">NEXUS</h1>
          <p className="font-display font-semibold tracking-wide uppercase text-[10px] text-[var(--color-on-surface-variant)] truncate">Real-Time Connection</p>
        </div>
      </div>

      <button className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] text-[var(--color-on-primary)] font-display font-bold py-3 px-4 rounded-xl shadow-ambient hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group shrink-0">
        <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300">add</span>
        New Discussion
      </button>

      <nav className="flex-grow space-y-1">
        <button 
          onClick={() => handleTabChange('chats')}
          className={`w-full flex items-center gap-4 py-3 px-4 rounded-lg font-display font-semibold tracking-wide uppercase text-xs transition-all relative ${activeTab === 'chats' ? "text-[var(--color-primary)] after:content-[''] after:absolute after:left-0 after:w-1 after:h-6 after:bg-[var(--color-secondary)] after:rounded-r-full" : "text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-primary)] hover:translate-x-1"}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'chats' ? "'FILL' 1" : undefined }}>chat_bubble</span>
          Messages
        </button>

        <button 
          onClick={() => handleTabChange('community')}
          className={`w-full flex items-center gap-4 py-3 px-4 rounded-lg font-display font-semibold tracking-wide uppercase text-xs transition-all relative ${activeTab === 'community' ? "text-[var(--color-primary)] after:content-[''] after:absolute after:left-0 after:w-1 after:h-6 after:bg-[var(--color-secondary)] after:rounded-r-full" : "text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-primary)] hover:translate-x-1"}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'community' ? "'FILL' 1" : undefined }}>forum</span>
          Forum
        </button>

        <button 
          onClick={() => handleTabChange('requests')}
           className={`w-full flex items-center gap-4 py-3 px-4 rounded-lg font-display font-semibold tracking-wide uppercase text-xs transition-all relative ${activeTab === 'requests' ? "text-[var(--color-primary)] after:content-[''] after:absolute after:left-0 after:w-1 after:h-6 after:bg-[var(--color-secondary)] after:rounded-r-full" : "text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-primary)] hover:translate-x-1"}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'requests' ? "'FILL' 1" : undefined }}>auto_awesome_motion</span>
          Requests
        </button>

        <button 
          onClick={() => handleTabChange('search')}
          className={`w-full flex items-center gap-4 py-3 px-4 rounded-lg font-display font-semibold tracking-wide uppercase text-xs transition-all relative ${activeTab === 'search' ? "text-[var(--color-primary)] after:content-[''] after:absolute after:left-0 after:w-1 after:h-6 after:bg-[var(--color-secondary)] after:rounded-r-full" : "text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-primary)] hover:translate-x-1"}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'search' ? "'FILL' 1" : undefined }}>search</span>
          Search
        </button>
      </nav>

      <div className="pt-4 border-t ghost-border space-y-1 shrink-0">
        <button 
          onClick={() => handleTabChange('settings')}
          className={`w-full flex items-center gap-4 py-3 px-4 rounded-lg font-display font-semibold tracking-wide uppercase text-xs transition-all relative ${activeTab === 'settings' ? "text-[var(--color-primary)] after:content-[''] after:absolute after:left-0 after:w-1 after:h-6 after:bg-[var(--color-secondary)] after:rounded-r-full" : "text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-primary)] hover:translate-x-1"}`}
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : undefined }}>settings</span>
          Settings
        </button>
      </div>

      <div className="pt-4 mt-2 border-t ghost-border space-y-1 shrink-0">
         <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 py-2 px-4 rounded-lg text-red-500/80 font-display font-semibold tracking-wide uppercase text-[10px] hover:text-red-600 hover:bg-red-500/10 transition-all"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
