'use client';

import { useState } from 'react';
import { THEMES, type ThemeName, type ThemeMode, FOOTER_MESSAGES } from '@/lib/constants';
import { signUp, signIn, signInAsGuest } from '@/lib/supabase-service';
import { supabase } from '@/lib/supabase';

interface AuthScreenProps {
  onAuth: (user: { id: string; email: string; name: string | null; theme: string }) => void;
  theme: ThemeName;
  themeMode: ThemeMode;
}

export default function AuthScreen({ onAuth, theme, themeMode }: AuthScreenProps) {
  const t = THEMES[theme][themeMode];
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [footerIdx] = useState(() => Math.floor(Math.random() * FOOTER_MESSAGES.length));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password, name.trim() || undefined);
      } else {
        await signIn(email, password);
      }

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        onAuth({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || null,
          theme: user.user_metadata?.theme || 'Sage',
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('already registered') || msg.includes('already in use')) {
          setError('Email already registered');
        } else if (msg.includes('Invalid login') || msg.includes('Invalid credentials') || msg.includes('Invalid email or password')) {
          setError('Invalid credentials');
        } else {
          setError(msg);
        }
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  // Guest entry. Same destination as logging in — an anonymous Supabase user
  // — so nothing downstream needs to know the difference. Only the error
  // handling is special: if the project has not enabled anonymous sign-ins
  // yet, say so plainly instead of surfacing a raw API message.
  const handleGuest = async () => {
    setError('');
    setLoading(true);

    try {
      await signInAsGuest();

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        onAuth({
          id: user.id,
          email: user.email ?? '',
          name: user.user_metadata?.name || 'Guest',
          theme: user.user_metadata?.theme || 'Sage',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (/anonymous/i.test(msg) && /disabl|not enabled|not allowed/i.test(msg)) {
        setError('Guest access is not switched on for this app yet.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Could not start a guest session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: t.bg, color: t.text, transition: 'background-color 0.3s, color 0.3s' }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6"
        style={{
          backgroundColor: t.cardBg,
          border: `1px solid ${t.lightLine}`,
          transition: 'background-color 0.3s, border-color 0.3s',
        }}
      >
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.text }}>
            Glimmer Journal
          </h1>
          <p className="text-sm mt-1" style={{ color: t.muted }}>
            Track micro-moments of safety
          </p>
        </div>

        <div className="flex rounded-lg p-1 mb-5" style={{ backgroundColor: t.hover }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200"
              style={{
                backgroundColor: mode === m ? t.btnBg : 'transparent',
                color: mode === m ? t.btnFg : t.muted,
                minHeight: 44,
              }}
            >
              {m === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                backgroundColor: t.hover,
                border: `1px solid ${t.lightLine}`,
                color: t.text,
                minHeight: 44,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = t.border)}
              onBlur={(e) => (e.currentTarget.style.borderColor = t.lightLine)}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: t.hover,
              border: `1px solid ${t.lightLine}`,
              color: t.text,
              minHeight: 44,
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = t.border)}
            onBlur={(e) => (e.currentTarget.style.borderColor = t.lightLine)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: t.hover,
              border: `1px solid ${t.lightLine}`,
              color: t.text,
              minHeight: 44,
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = t.border)}
            onBlur={(e) => (e.currentTarget.style.borderColor = t.lightLine)}
          />

          {error && (
            <p className="text-sm" style={{ color: '#E05555' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-1"
            style={{
              backgroundColor: loading ? t.lightLine : t.btnBg,
              color: t.btnFg,
              minHeight: 44,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        {/* Guest entry — no email, no password. */}
        <div className="flex items-center gap-3 mt-5">
          <span className="flex-1 h-px" style={{ backgroundColor: t.lightLine }} />
          <span className="text-xs" style={{ color: t.muted }}>or</span>
          <span className="flex-1 h-px" style={{ backgroundColor: t.lightLine }} />
        </div>

        <button
          type="button"
          onClick={handleGuest}
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-3"
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${t.lightLine}`,
            color: t.text,
            minHeight: 44,
            opacity: loading ? 0.7 : 1,
          }}
        >
          Continue as guest
        </button>

        <p className="text-center text-xs mt-3" style={{ color: t.muted }}>
          No email needed — your entries stay linked to this browser.
        </p>

        <p className="text-center text-xs mt-5" style={{ color: t.muted }}>
          {mode === 'login'
            ? 'Every glimmer you notice rewires your nervous system.'
            : 'Welcome to your glimmer practice. There\'s no wrong way to start.'}
        </p>
      </div>

      <p
        className="text-xs text-center mt-6 max-w-xs leading-relaxed"
        style={{ color: t.footer, transition: 'color 0.3s' }}
      >
        {FOOTER_MESSAGES[footerIdx]}
      </p>
    </div>
  );
}
