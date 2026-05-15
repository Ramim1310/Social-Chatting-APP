import React, { useState, useEffect } from 'react';
import Dashboard from './layouts/Dashboard';
import Login from './features/auth/Login';
import Signup from './features/auth/Signup';
import WelcomeScreen from './components/common/WelcomeScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [view, setView] = useState("login"); // login, signup, welcome, chat
  const [initialViewTab, setInitialViewTab] = useState("chats");
  const [isInitializing, setIsInitializing] = useState(true);

  const fetchUserInfo = async (preloadedUser = null) => {
      if (preloadedUser) {
          setUser(preloadedUser);
          localStorage.setItem('user', JSON.stringify(preloadedUser));
          return;
      }
      try {
          console.log('Fetching updated user info...');
          const response = await api.get('/api/users/me');
          console.log('User data received:', response.data);
          console.log('Friends count:', response.data.friends?.length || 0);
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));
      } catch (error) {
          console.error("Failed to fetch user info — using cached data", error);
          // Fall back to cached user so the app still loads
          const cached = localStorage.getItem('user');
          if (cached) setUser(JSON.parse(cached));
      }
  };

  useEffect(() => {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      // Safety net: never hang on loading screen longer than 8 seconds
      const safetyTimer = setTimeout(() => setIsInitializing(false), 8000);

      if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setView('chat');
          
          // CRITICAL FIX: Instantly drop the loading spinner using cached data,
          // then fetch the updated profile in the background. This fixes the 2-3s delay.
          clearTimeout(safetyTimer);
          setIsInitializing(false);
          
          // Background sync
          fetchUserInfo().catch(err => console.error('Background user sync failed:', err));
      } else {
          clearTimeout(safetyTimer);
          setIsInitializing(false);
      }

      // Listen for session expiry signalled by the API interceptor
      const handleAuthLogout = () => {
          setUser(null);
          setToken(null);
          setView('login');
          setIsInitializing(false);
      };
      window.addEventListener('auth:logout', handleAuthLogout);
      return () => {
          clearTimeout(safetyTimer);
          window.removeEventListener('auth:logout', handleAuthLogout);
      };
  }, []);

  const handleLogin = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
    setUser(userData);
    setToken(authToken);
    setView("welcome"); // Show welcome screen first
  };

  const handleStartChatting = (tab = "chats") => {
    setInitialViewTab(tab);
    setView("chat");
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('activeRoom');
    localStorage.removeItem('activeChatName');
    setUser(null);
    setToken(null);
    setView("login");
  };

  return (
    <ThemeProvider>
    <div className="App">
      {isInitializing ? (
        <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface)]">
          <div className="flex flex-col items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] flex items-center justify-center shadow-xl">
              <span className="material-symbols-outlined text-[var(--color-on-primary)] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <p className="text-xs font-body font-semibold text-[var(--color-on-surface-variant)] tracking-widest uppercase">Loading...</p>
            </div>
          </div>
        </div>
      ) : (
        <>
      {view === "login" && (
        <Login 
          onLogin={handleLogin} 
          onSwitchToSignup={() => setView("signup")} 
        />
      )}
      {view === "signup" && (
        <Signup 
          onLogin={handleLogin} 
          onSwitchToLogin={() => setView("login")} 
        />
      )}
      
      <AnimatePresence mode="wait">
        {view === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <WelcomeScreen 
              name={user?.name} 
              onStart={handleStartChatting}
            />
          </motion.div>
        )}
        
        {view === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Dashboard user={user} onLogout={handleLogout} refreshUser={fetchUserInfo} initialTab={initialViewTab} />
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
    </ThemeProvider>
  );
}

export default App;
