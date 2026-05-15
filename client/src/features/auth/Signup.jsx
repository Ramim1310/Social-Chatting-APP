import React, { useState } from 'react';
import api from '../../services/api';

function Signup({ onLogin, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await api.post('/api/auth/register', { name, email, password });
       onLogin(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      <div className="card-lowest p-8 shadow-ambient w-full max-w-sm ghost-border">
        <h2 className="text-3xl font-bold mb-6 text-center text-[var(--color-primary)] title-font">Sign Up</h2>
        {error && <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] p-2 rounded mb-4 text-sm text-center font-medium ghost-border">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col">
            <label className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1 title-font">Username</label>
            <input
              type="text"
              placeholder="Choose a username"
              className="w-full p-3 bg-[var(--color-surface-variant)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] ghost-border outline-none text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1 title-font">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 bg-[var(--color-surface-variant)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] ghost-border outline-none text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-widest font-bold mb-1 title-font">Password</label>
            <input
              type="password"
              placeholder="Create a password"
              className="w-full p-3 bg-[var(--color-surface-variant)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] ghost-border outline-none text-[var(--color-on-surface)] placeholder-[var(--color-on-surface-variant)] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full cta-gradient text-[var(--color-on-primary)] shadow-ambient hover:scale-105 active:scale-95 p-3 rounded-lg font-bold transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Creating account...
              </>
            ) : 'Sign Up'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--color-on-surface-variant)]">
          Already have an account? <button onClick={onSwitchToLogin} className="text-[var(--color-primary)] font-bold hover:underline title-font">Log in</button>
        </p>
      </div>
    </div>
  );
}

export default Signup;
