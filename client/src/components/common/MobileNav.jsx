import React from 'react';

export default function MobileNav({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'chats', icon: 'chat_bubble', label: 'Messages' },
    { id: 'community', icon: 'forum', label: 'Forum' },
    { id: 'requests', icon: 'auto_awesome_motion', label: 'Requests' },
    { id: 'search', icon: 'explore', label: 'Discover' },
    { id: 'settings', icon: 'settings', label: 'Settings' }
  ];

  return (
    <nav aria-label="Main navigation" className="mobile-navigation md:hidden fixed bottom-0 left-0 w-full bg-[var(--color-surface)] border-t border-[var(--color-outline-variant)]/30 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-1" style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 min-w-0 flex-col items-center gap-1 px-0.5 py-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-[var(--color-primary)]' 
                  : 'text-[var(--color-on-surface-variant)]/60 hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-low)]'
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                isActive ? 'bg-[var(--color-primary-fixed)]' : 'bg-transparent'
              }`}>
                <span 
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {tab.icon}
                </span>
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
