import React, { useState, useRef } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-container-high)]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function SettingsCard({ icon, iconBg, title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--color-surface-container-lowest)] rounded-2xl border border-[var(--color-outline-variant)]/20 shadow-sm p-7 space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
        <h2 className="text-xl font-black text-[var(--color-on-surface)]" style={{ fontFamily: "'Manrope', sans-serif" }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings({ user, onUserUpdate }) {
  const { prefs, updatePref } = useTheme();
  const fileInputRef = useRef(null);

  // Profile state
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(user?.name || '');
  const [imagePreview, setImagePreview] = useState(user?.image || null);
  const [imageBase64, setImageBase64] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security
  const [showPwChange, setShowPwChange] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ── Image pick ───────────────────────────────────────────────────────────
  const handleImagePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target.result);
      setImageBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // ── Save profile ─────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const body = {};
      if (name.trim() && name !== user?.name) body.name = name.trim();
      if (imageBase64) body.image = imageBase64;
      if (!Object.keys(body).length) { toast('No changes to save'); setSavingProfile(false); return; }
      const res = await api.patch('/api/users/me', body);
      onUserUpdate(res.data);
      toast.success('Profile updated!');
      setImageBase64(null);
    } catch (e) {
      toast.error('Failed to save profile.');
    }
    setSavingProfile(false);
  };

  const hasProfileChanges = !!name.trim() || !!imageBase64;

  const THEMES = [
    { label: 'Light', icon: 'light_mode' },
    { label: 'Dark',  icon: 'dark_mode' },
    { label: 'OLED',  icon: 'nights_stay' },
  ];

  const TOGGLES = [
    { key: 'zenMode',      label: 'Zen Mode',       desc: 'Hide non-essential UI elements for deep focus.' },
    { key: 'highContrast', label: 'High Contrast',  desc: 'Increase visibility of text and borders.' },
    { key: 'notifications',label: 'Notifications',  desc: 'Enable in-app message and alert notifications.' },
    { key: 'soundEffects', label: 'Sound Effects',  desc: 'Play subtle sounds for messages and actions.' },
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-[var(--color-surface)] custom-scrollbar transition-colors duration-300" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)]/90 backdrop-blur-sm border-b border-[var(--color-outline-variant)]/15 px-8 py-4 flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-widest text-[var(--color-on-surface-variant)] uppercase">Settings &amp; Personalization</h1>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-[18px]">account_circle</span>
          </div>
          <div className="w-9 h-9 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--color-on-surface-variant)] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 md:px-10 py-10">
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-4xl font-black text-[var(--color-on-surface)] mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Your Settings</h2>
          <p className="text-sm text-[var(--color-on-surface-variant)]">Personalise your NEXUS experience — appearance, privacy, and account details.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* ── LEFT ────────────────────────────────────────────────────── */}
          <div className="space-y-6">
            
            <div className="flex items-center gap-2 border-b border-[var(--color-outline-variant)]/20 pb-4 mb-2 overflow-x-auto custom-scrollbar">
              {[
                { id: 'profile', label: 'Profile' },
                { id: 'visual', label: 'Visual Identity' },
                { id: 'security', label: 'Account Security' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Profile Identity */}
            {activeTab === 'profile' && (
            <SettingsCard icon="person" iconBg="bg-gradient-to-br from-[#4a40e0] to-[#9795ff]" title="Profile Identity">
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  {imagePreview
                    ? <img src={imagePreview} className="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-[var(--color-primary)]/20" />
                    : <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#4a40e0] to-[#9795ff] flex items-center justify-center text-4xl font-black text-white shadow-md">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                  }
                  <button onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dim)] rounded-full flex items-center justify-center shadow-lg transition-colors">
                    <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] block mb-1">Display Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)] text-sm font-semibold text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] block mb-1">Email</label>
                    <div className="h-11 px-4 rounded-xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)] flex items-center text-sm text-[var(--color-on-surface-variant)]">{user?.email}</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button id="save-profile-btn" onClick={handleSaveProfile} disabled={!hasProfileChanges || savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dim,#3d30d4)] text-[var(--color-on-primary)] font-bold text-sm shadow-[0_8px_20px_rgba(74,64,224,0.2)] hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100">
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                {hasProfileChanges && (
                  <button onClick={() => { setName(user?.name || ''); setImagePreview(user?.image || null); setImageBase64(null); }}
                    className="px-4 py-2.5 rounded-xl border border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface-variant)] text-sm font-semibold hover:bg-[var(--color-surface-container-low)] transition-colors">
                    Discard
                  </button>
                )}
              </div>
            </SettingsCard>
            )}

            {/* Visual Identity */}
            {activeTab === 'visual' && (
            <SettingsCard icon="palette" iconBg="bg-gradient-to-br from-teal-400 to-indigo-500" title="Visual Identity">
              {/* Theme Mode */}
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] block mb-3">Theme Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {THEMES.map(({ label, icon }) => (
                    <button key={label} onClick={() => updatePref('themeMode', label)}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all ${prefs.themeMode === label ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8' : 'border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)] hover:border-[var(--color-outline-variant)]/50'}`}>
                      <span className={`material-symbols-outlined text-[22px] ${prefs.themeMode === label ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      <span className={`text-xs font-bold ${prefs.themeMode === label ? 'text-[var(--color-primary)]' : 'text-[var(--color-on-surface-variant)]'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              {TOGGLES.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-t border-[var(--color-outline-variant)]/10">
                  <div>
                    <p className="font-semibold text-sm text-[var(--color-on-surface)]">{label}</p>
                    <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">{desc}</p>
                  </div>
                  <Toggle checked={prefs[key]} onChange={(v) => updatePref(key, v)} />
                </div>
              ))}

              {/* Zen Mode info banner */}
              {prefs.zenMode && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-[18px]">self_improvement</span>
                  <p className="text-xs text-[var(--color-primary)] font-semibold">Zen Mode active — non-essential UI is hidden</p>
                </div>
              )}
            </SettingsCard>
            )}

            {/* Account Security */}
            {activeTab === 'security' && (
            <SettingsCard icon="manage_accounts" iconBg="bg-gradient-to-br from-slate-500 to-slate-700" title="Account Security">
              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] block mb-1.5">Email Address</label>
                <div className="flex items-center h-12 px-4 rounded-xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)] justify-between">
                  <span className="text-sm text-[var(--color-on-surface)]">{user?.email}</span>
                  <span className="text-xs font-bold text-[var(--color-primary)] cursor-pointer hover:underline">CHANGE</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)] block mb-1.5">Password</label>
                {!showPwChange ? (
                  <div className="flex items-center h-12 px-4 rounded-xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)] justify-between">
                    <span className="text-sm text-[var(--color-on-surface-variant)] tracking-widest">•••••••••••••••</span>
                    <button onClick={() => setShowPwChange(true)} className="text-xs font-bold text-[var(--color-primary)] hover:underline">UPDATE</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[{ p: 'Current password', v: currentPw, s: setCurrentPw }, { p: 'New password', v: newPw, s: setNewPw }, { p: 'Confirm new password', v: confirmPw, s: setConfirmPw }].map(({ p, v, s }) => (
                      <input key={p} type="password" placeholder={p} value={v} onChange={e => s(e.target.value)}
                        className="w-full h-11 px-4 rounded-xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)] text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all placeholder:text-[var(--color-on-surface-variant)]/50" />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { toast('Password change requires email verification — coming soon!'); setShowPwChange(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                        className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs font-bold transition-colors">Update Password</button>
                      <button onClick={() => { setShowPwChange(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); }}
                        className="px-4 py-2 rounded-xl border border-[var(--color-outline-variant)]/20 text-[var(--color-on-surface-variant)] text-xs font-semibold hover:bg-[var(--color-surface-container-low)] transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-semibold text-sm text-[var(--color-on-surface)]">Two-Factor Authentication</p>
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">Add an extra layer of security to your account.</p>
                </div>
                <button className="px-4 py-2 rounded-xl border border-[var(--color-outline-variant)]/20 text-xs font-bold text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-colors">Enable 2FA</button>
              </div>
            </SettingsCard>
            )}
          </div>

          {/* ── RIGHT ───────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* NEXUS Pro upgrade card */}
            <div className="rounded-2xl p-6 space-y-4 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
              {/* Glowing orb decoration */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[var(--color-primary)]/30 blur-2xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  <span className="text-[10px] font-black tracking-widest uppercase text-[var(--color-primary)]">NEXUS Pro</span>
                </div>
                <h3 className="text-white font-black text-xl mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>Unlock the Full Network</h3>
                <p className="text-gray-300 text-xs leading-relaxed mb-4">Get unlimited message history, priority matching, custom community themes, and advanced analytics to grow your connections.</p>
                <button className="w-full py-3 rounded-xl font-black text-xs tracking-widest uppercase transition-all hover:scale-105 active:scale-95" style={{ background: 'linear-gradient(90deg, var(--color-primary), #7c3aed)', color: 'white' }}>
                  Upgrade to Pro
                </button>
              </div>
            </div>

            {/* Connection Stats */}
            <div className="bg-[var(--color-surface-container-lowest)] rounded-2xl border border-[var(--color-outline-variant)]/15 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--color-primary)] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>network_node</span>
                <h3 className="font-black text-[var(--color-on-surface)] text-base" style={{ fontFamily: "'Manrope', sans-serif" }}>Your Network</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Friends',      val: `${user?.friends?.length ?? 0}`,  icon: 'group' },
                  { label: 'Communities', val: '3',    icon: 'forum' },
                ].map(({ label, val, icon }) => (
                  <div key={label} className="bg-[var(--color-surface-container-low)] rounded-xl p-4 border border-[var(--color-outline-variant)]/10 flex flex-col gap-1">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                    <p className="text-xl font-black text-[var(--color-on-surface)]">{val}</p>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-outline)]">{label}</p>
                  </div>
                ))}
              </div>
              {/* Active status */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="text-xs text-emerald-600 font-semibold">You're connected to NEXUS</p>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-2xl border p-6 space-y-3" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                <h3 className="font-black text-[var(--color-on-surface)] text-base" style={{ fontFamily: "'Manrope', sans-serif" }}>Danger Zone</h3>
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] leading-relaxed">Permanently delete your NEXUS account, all messages, and community posts. This action cannot be undone.</p>
              <button onClick={() => toast.error('Account deactivation requires email confirmation. Contact support.')}
                className="text-red-500 font-black text-xs tracking-widest uppercase hover:text-red-700 transition-colors">
                Deactivate Account
              </button>
            </div>

            <div className="px-2 py-1">
              <p className="text-xs text-[var(--color-on-surface-variant)] font-semibold">NEXUS</p>
              <p className="text-[10px] text-[var(--color-outline)]">Version 1.0.0 — Real-Time Connection Platform</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
