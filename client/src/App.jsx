import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AnimatePresence, motion as Motion, MotionConfig } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import Login from './features/auth/Login';
import Signup from './features/auth/Signup';
import { ThemeProvider } from './context/ThemeContext';
import { getLandingTab } from './services/conversationHistory';
import api from './services/api';
import socket from './services/socket';
import NexusLogo from './components/common/NexusLogo';

const Dashboard = lazy(() => import('./layouts/Dashboard'));

function readSession() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return localStorage.getItem('token') && user?.id ? user : null;
  } catch { return null; }
}

export default function App() {
  const [user, setUser] = useState(readSession);
  const [view, setView] = useState(() => readSession() ? 'chat' : 'login');
  const queryClient = useQueryClient();
  const fetchUserInfo = useCallback(async (updatedUser = null) => {
    if (!readSession()) return;
    try {
      const next = updatedUser ? { ...readSession(), ...updatedUser } : (await api.get('/api/users/me')).data;
      if (readSession()?.id !== next.id) return;
      localStorage.setItem('user', JSON.stringify(next));
      setUser(next);
    } catch (error) { console.error('Profile sync failed:', error.message); }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { if (readSession()) fetchUserInfo(); });
    const handleExpired = () => { setUser(null); setView('login'); queryClient.clear(); socket.disconnect(); };
    window.addEventListener('auth:logout', handleExpired);
    return () => window.removeEventListener('auth:logout', handleExpired);
  }, [fetchUserInfo, queryClient]);

  function handleLogin(nextUser, token) {
    queryClient.clear();
    localStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('token', token);
    window.location.hash = '#/' + getLandingTab(nextUser.id);
    setUser(nextUser); setView('chat'); socket.connect();
  }
  function handleLogout() {
    for (const key of ['user','token','activeRoom','activeChatName']) localStorage.removeItem(key);
    queryClient.clear(); socket.disconnect(); setUser(null); setView('login');
    window.location.hash = '#/home';
  }
  return <ThemeProvider><MotionConfig reducedMotion="user"><Suspense fallback={<div role="status" className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[var(--color-surface)]"><NexusLogo size={48} glow className="animate-pulse" /><p className="text-sm text-[var(--color-on-surface-variant)]">Getting your space ready…</p></div>}><AnimatePresence mode="wait" initial={false}>
    <Motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}>
      {view === 'chat' && user ? <Dashboard key={user.id} user={user} onLogout={handleLogout} refreshUser={fetchUserInfo} /> : view === 'signup' ? <Signup onLogin={handleLogin} onSwitchToLogin={() => setView('login')} /> : <Login onLogin={handleLogin} onSwitchToSignup={() => setView('signup')} />}
    </Motion.div>
  </AnimatePresence></Suspense></MotionConfig></ThemeProvider>;
}
