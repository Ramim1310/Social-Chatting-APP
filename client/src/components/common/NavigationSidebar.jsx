import { useTheme } from '../../context/useTheme';
import NexusLogo from './NexusLogo';

const tabs = [
  { id: 'home', icon: 'space_dashboard', label: 'Home' },
  { id: 'chats', icon: 'chat_bubble', label: 'Messages' },
  { id: 'community', icon: 'forum', label: 'Forum' },
  { id: 'requests', icon: 'person_add', label: 'Requests' },
  { id: 'search', icon: 'explore', label: 'Discover' },
];

export default function NavigationSidebar({ user, onLogout, onTabChange, onCompose, activeTab = 'home', className = '' }) {
  const { prefs, updatePref } = useTheme();
  return (
    <aside aria-label="Workspace sidebar" className={`app-sidebar hidden md:flex shrink-0 flex-col w-60 xl:w-64 h-full p-5 gap-7 overflow-y-auto ${className}`}>
      <button onClick={() => onTabChange('home')} aria-label="Nexus Home" className="flex items-center gap-3 px-2 text-left group transition-opacity hover:opacity-90">
        <NexusLogo size={40} glow className="group-hover:scale-105 transition-transform" />
        <span><span className="font-display font-extrabold text-xl tracking-[-0.06em] block">nexus<span className="text-[var(--color-primary)]">.</span></span><span className="text-[10px] text-[var(--color-on-surface-variant)] tracking-wide">A little more connected.</span></span>
      </button>
      <button onClick={onCompose} className="primary-button w-full text-sm"><span aria-hidden="true" className="material-symbols-outlined text-xl">add</span> New conversation</button>
      <nav aria-label="Main navigation" className="flex-1 space-y-1.5">
        <p className="eyebrow px-3 mb-4">Your workspace</p>
        {tabs.map(tab => <button key={tab.id} onClick={() => onTabChange(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined} className={`nav-item ${activeTab === tab.id ? 'is-active' : ''}`}><span aria-hidden="true" className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: `'FILL' ${activeTab === tab.id ? 1 : 0}` }}>{tab.icon}</span><span className="flex-1 text-left font-semibold text-sm">{tab.label}</span>{activeTab === tab.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />}</button>)}
      </nav>
      <div className="sidebar-note rounded-2xl p-4"><span aria-hidden="true" className="material-symbols-outlined text-[var(--color-secondary)] mb-2">waving_hand</span><p className="text-sm font-bold mb-1">A hello goes a long way.</p><p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed mb-3">There’s always room for you in Public Square.</p><button onClick={() => onTabChange('home')} className="text-xs font-bold text-[var(--color-primary)] hover:underline">Explore your space <span aria-hidden="true">↗</span></button></div>
      <div className="space-y-3 pt-4 border-t border-[var(--color-outline-variant)]/30">
        <div className="flex items-center gap-1"><button onClick={() => onTabChange('settings')} aria-current={activeTab === 'settings' ? 'page' : undefined} className={`nav-item flex-1 ${activeTab === 'settings' ? 'is-active' : ''}`}><span aria-hidden="true" className="material-symbols-outlined text-xl">tune</span><span className="text-sm font-semibold">Settings</span></button><button onClick={() => updatePref('themeMode', prefs.themeMode === 'Light' ? 'Dark' : 'Light')} className="icon-button" aria-label={prefs.themeMode === 'Light' ? 'Switch to dark mode' : 'Switch to light mode'} title="Change theme"><span aria-hidden="true" className="material-symbols-outlined text-xl">{prefs.themeMode === 'Light' ? 'dark_mode' : 'light_mode'}</span></button></div>
        <div className="flex items-center gap-3 px-2"><button onClick={() => onTabChange('settings')} aria-label="Open your profile" className="avatar shrink-0">{user?.image ? <img src={user.image} alt="" /> : user?.name?.[0]?.toUpperCase() || 'N'}</button><div className="min-w-0 flex-1"><p className="text-sm font-bold truncate">{user?.name || 'Your profile'}</p><p className="text-[11px] text-[var(--color-on-surface-variant)]">Make yourself at home</p></div><button onClick={onLogout} className="icon-button" aria-label="Log out" title="Log out"><span aria-hidden="true" className="material-symbols-outlined text-xl">logout</span></button></div>
      </div>
    </aside>
  );
}
