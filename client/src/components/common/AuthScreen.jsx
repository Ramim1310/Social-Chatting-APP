import { useState } from 'react';
import api from '../../services/api';
import NexusLogo from './NexusLogo';

export default function AuthScreen({ signup = false, onLogin, onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  async function handleSubmit(event) {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true); setError('');
    try {
      const { data } = await api.post(`/api/auth/${signup ? 'register' : 'login'}`, { ...(signup ? { name: name.trim() } : {}), email: email.trim(), password });
      onLogin(data.user, data.token);
    } catch (err) { setError(err.response?.data?.error || 'We couldn’t connect. Please try again.'); }
    finally { setIsLoading(false); }
  }
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="flex items-center gap-3"><NexusLogo size={42} glow /><span className="font-display font-extrabold text-2xl tracking-tight">nexus.</span></div>
        <div className="relative z-10 my-auto py-16 max-w-lg"><span className="auth-pill"><span className="w-2 h-2 rounded-full bg-teal-300" /> Your people are out there</span><h1 className="font-display text-5xl lg:text-6xl font-extrabold leading-[1.12] tracking-[-0.055em] mt-7">Small hellos.<br />Big connections<span className="text-teal-300">.</span></h1><p className="text-white/75 leading-relaxed mt-6 max-w-sm">A place for the conversations that make your day. Catch up, share an idea, or find your next favorite community.</p><div className="auth-chat mt-10"><span className="avatar bg-teal-200 text-teal-900">N</span><div className="bg-white/15 border border-white/15 rounded-2xl rounded-bl-md p-4"><p className="text-xs font-bold text-teal-200 mb-1">The group chat</p><p className="text-sm">Good ideas start with “hear me out…” ✨</p></div></div><div className="flex gap-2 mt-5 ml-14 text-xs text-white/70"><span className="auth-pill">Chat</span><span className="auth-pill">Connect</span><span className="auth-pill">Belong</span></div></div>
        <p className="text-xs text-white/60">A little more connection. A little less scrolling.</p>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12 min-w-0">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="md:hidden flex items-center gap-2 mb-10"><NexusLogo size={36} /><span className="font-display text-xl font-extrabold">nexus.</span></div>
          <p className="eyebrow text-[var(--color-primary)] mb-3">{signup ? 'Your next chapter starts here' : 'Good to see you again'}</p><h2 className="text-3xl font-display font-extrabold tracking-tight mb-3">{signup ? 'Find your kind of people.' : 'Welcome back.'}</h2><p className="text-sm text-[var(--color-on-surface-variant)] mb-8">{signup ? 'Create your account and make yourself at home.' : 'Your conversations are waiting. Jump back in.'}</p>
          {error && <p role="alert" className="rounded-xl bg-[var(--color-error)]/10 text-[var(--color-error)] p-4 mb-5 text-sm">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-5">
            {signup && <div><label htmlFor="auth-name" className="field-label">Your name</label><input id="auth-name" autoComplete="nickname" required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="What should we call you?" className="text-field" /></div>}
            <div><label htmlFor="auth-email" className="field-label">Email address</label><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="text-field" /></div>
            <div><label htmlFor="auth-password" className="field-label">Password</label><div className="relative"><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 6 : undefined} required value={password} onChange={e => setPassword(e.target.value)} placeholder={signup ? 'At least 6 characters' : 'Enter your password'} className="text-field pr-12" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 icon-button"><span aria-hidden="true" className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span></button></div></div>
            <button type="submit" disabled={isLoading} className="primary-button w-full mt-2">{isLoading ? <><span className="button-spinner" /> {signup ? 'Creating your account…' : 'Signing you in…'}</> : <>{signup ? 'Create account' : 'Let’s go'} <span aria-hidden="true" className="material-symbols-outlined text-xl">arrow_forward</span></>}</button>
          </form>
          <p className="mt-7 text-sm text-[var(--color-on-surface-variant)]">{signup ? 'Already part of the conversation?' : 'New around here?'} <button onClick={onSwitch} className="font-bold text-[var(--color-primary)] hover:underline">{signup ? 'Log in' : 'Create an account'}</button></p>
        </div>
      </section>
    </main>
  );
}
