import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const ThemeCtx = createContext(null);

const STORAGE_KEY = 'cg_prefs';

const defaults = {
  themeMode: 'Light',   // Light | Dark | OLED
  zenMode: false,
  highContrast: false,
  notifications: true,
  soundEffects: false,
};

function applyTheme(prefs) {
  const root = document.documentElement;

  // ── Theme Mode ────────────────────────────────────────────────────────────
  root.setAttribute('data-theme', prefs.themeMode.toLowerCase());

  // ── Zen Mode ────────────────────────────────────────────────────────────
  root.setAttribute('data-zen', prefs.zenMode ? 'true' : 'false');

  // ── High Contrast ────────────────────────────────────────────────────────
  root.setAttribute('data-hc', prefs.highContrast ? 'true' : 'false');
}

export function ThemeProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try {
      return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch { return defaults; }
  });

  // Tiny beep via Web Audio API (no file needed)
  const audioCtx = useRef(null);
  const playSound = useCallback(() => {
    if (!prefs.soundEffects) return;
    try {
      if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } catch (_) {}
  }, [prefs.soundEffects]);

  // Request notification permission when toggled on
  const requestNotifPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  // Show a browser notification
  const showNotification = useCallback((title, body) => {
    if (!prefs.notifications) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, [prefs.notifications]);

  // Apply to DOM whenever prefs change
  useEffect(() => {
    applyTheme(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const updatePref = (key, value) => {
    setPrefs(p => ({ ...p, [key]: value }));
    if (key === 'notifications' && value) requestNotifPermission();
  };

  return (
    <ThemeCtx.Provider value={{ prefs, updatePref, playSound, showNotification }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
