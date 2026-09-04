'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  THEMES,
  FOOTER_MESSAGES,
  FIRST_TIME_MESSAGES,
  RETURN_MESSAGES,
  type ThemeName,
  type ThemeColors,
} from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { supabase } from '@/lib/supabase';
import { fetchEntries, fetchStats, signOut } from '@/lib/supabase-service';
import AuthScreen from '@/components/journal/AuthScreen';
import Sidebar from '@/components/journal/Sidebar';
import DailyEntry from '@/components/journal/DailyEntry';
import { CheckIn, Toolbox } from '@/components/journal/Regulate';
import GlimmerBank from '@/components/journal/GlimmerBank';
import WeeklyReflection from '@/components/journal/WeeklyReflection';
import StatsView from '@/components/journal/StatsView';

const TABS = [
  { id: 'daily', label: 'Daily Entry' },
  { id: 'checkin', label: 'Check-in' },
  { id: 'toolbox', label: 'Toolbox' },
  { id: 'bank', label: 'Glimmer Bank' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'stats', label: 'Stats' },
] as const;

export default function Home() {
  const store = useJournalStore();
  const {
    user,
    setUser,
    theme,
    setTheme,
    activeTab,
    setActiveTab,
    sidebarOpen,
    setSidebarOpen,
    setEntries,
    setStats,
    toastMessage,
    milestoneMessage,
    showMilestone,
  } = store;

  const t: ThemeColors = THEMES[theme];
  const [initializing, setInitializing] = useState(true);
  const [footerIdx, setFooterIdx] = useState(0);

  // Rotating footer messages
  useEffect(() => {
    const interval = setInterval(() => {
      setFooterIdx((i) => (i + 1) % FOOTER_MESSAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []); // Footer rotation - forces new build

  // Register service worker for PWA install support.
  // Chrome/Brave require a registered SW with a fetch handler before they'll
  // fire the `beforeinstallprompt` event (which the Sidebar's Install button
  // listens for). Without this, the Install button never shows on Android.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    // Only register in production — in dev, the SW interferes with HMR.
    if (process.env.NODE_ENV !== 'production') return;

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          // Silent fail — PWA install just won't work, app still works fine
          console.warn('SW registration failed:', err);
        });
    };

    // Register on next tick so it doesn't block initial page paint
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  // Welcome message based on entry count
  const welcomeMessage = useMemo(() => {
    const total = store.totalEntries;
    if (total === 0) {
      return FIRST_TIME_MESSAGES[Math.floor(Math.random() * FIRST_TIME_MESSAGES.length)];
    }
    return RETURN_MESSAGES[Math.floor(Math.random() * RETURN_MESSAGES.length)];
  }, [store.totalEntries]);

  const loadEntries = useCallback(async () => {
    try {
      const { entries, total } = await fetchEntries();
      useJournalStore.getState().setEntries(entries, total);
    } catch {
      // best effort
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const stats = await fetchStats();
      useJournalStore.getState().setStats(stats);
    } catch {
      // best effort
    }
  }, []);

  // Check Supabase session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, name: u.user_metadata?.name || null, theme: u.user_metadata?.theme || 'Mono' });
        if (u.user_metadata?.theme && THEMES[u.user_metadata.theme as ThemeName]) setTheme(u.user_metadata.theme as ThemeName);
        Promise.all([loadEntries(), loadStats()]).finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, name: u.user_metadata?.name || null, theme: u.user_metadata?.theme || 'Mono' });
        loadEntries();
        loadStats();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        useJournalStore.getState().setEntries([], 0);
        useJournalStore.getState().setStats(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadEntries, loadStats]);

  const handleAuth = useCallback(
    (userData: { id: string; email: string; name: string | null; theme: string }) => {
      setUser(userData);
      if (userData.theme && THEMES[userData.theme as ThemeName]) {
        setTheme(userData.theme as ThemeName);
      }
      loadEntries();
      loadStats();
    },
    [loadEntries, loadStats, setUser, setTheme]
  );

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // best effort
    }
    setUser(null);
    useJournalStore.getState().setEntries([], 0);
    useJournalStore.getState().setStats(null);
  }, [setUser]);

  // Initializing screen
  if (initializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: t.bg, transition: 'background-color 0.3s' }}
      >
        <div
          className="w-8 h-8 rounded-full animate-spin"
          style={{ border: `2px solid ${t.lightLine}`, borderTopColor: t.btnBg }}
        />
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return <AuthScreen onAuth={handleAuth} theme={theme} />;
  }

  // Main app
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: t.bg,
        color: t.text,
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
      {/* Toast notification */}
      <div
        className="fixed top-0 left-0 right-0 z-[60] flex justify-center transition-all duration-300"
        style={{
          transform: toastMessage ? 'translateY(0)' : 'translateY(-100%)',
          opacity: toastMessage ? 1 : 0,
          pointerEvents: toastMessage ? 'auto' : 'none',
        }}
      >
        <div
          className="mt-4 px-5 py-3 rounded-xl text-sm font-medium shadow-lg"
          style={{
            backgroundColor: t.toastBg,
            color: t.toastFg,
            maxWidth: 400,
          }}
        >
          {toastMessage}
        </div>
      </div>

      {milestoneMessage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => useJournalStore.getState().showMilestone('')}
        >
          <div
            className="rounded-2xl p-8 text-center max-w-sm w-full"
            style={{
              backgroundColor: t.cardBg,
              border: `1px solid ${t.lightLine}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: t.text }}>Milestone!</h3>
            <p className="text-sm" style={{ color: t.muted }}>{milestoneMessage}</p>
            <button
              onClick={() => useJournalStore.getState().showMilestone('')}
              className="mt-5 px-6 py-2.5 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: t.btnBg,
                color: t.btnFg,
                minHeight: 44,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        <Sidebar onLogout={handleLogout} />

        <main className="flex-1 flex flex-col min-w-0">
          {/* Top bar (mobile) */}
          <header
            className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 lg:px-6"
            style={{
              backgroundColor: t.bg,
              borderBottom: `1px solid ${t.lightLine}`,
              transition: 'background-color 0.3s, border-color 0.3s',
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center rounded-lg"
              style={{ color: t.text, minHeight: 44, minWidth: 44 }}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>
            <h1 className="text-base font-semibold" style={{ color: t.text }}>
              Glimmer Journal
            </h1>
          </header>

          {/* Welcome message */}
          <div className="px-4 pt-4 lg:px-6">
            <p className="text-sm" style={{ color: t.muted }}>{welcomeMessage}</p>
          </div>

          {/* Tabs */}
          <nav className="px-4 pt-3 lg:px-6">
            <div
              className="flex gap-1 p-1 rounded-lg overflow-x-auto"
              style={{ backgroundColor: t.hover }}
            >
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap"
                    style={{
                      backgroundColor: isActive ? t.cardBg : 'transparent',
                      color: isActive ? t.text : t.muted,
                      minHeight: 44,
                      boxShadow: isActive ? `0 1px 3px rgba(0,0,0,0.08)` : 'none',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Tab content */}
          <div className="flex-1 px-4 py-4 lg:px-6">
            {activeTab === 'daily' && <DailyEntry />}
            {activeTab === 'checkin' && <CheckIn />}
            {activeTab === 'toolbox' && <Toolbox />}
            {activeTab === 'bank' && <GlimmerBank />}
            {activeTab === 'weekly' && <WeeklyReflection />}
            {activeTab === 'stats' && <StatsView />}
          </div>

          {/* Footer */}
          <footer
            className="mt-auto px-4 py-4 lg:px-6"
            style={{
              borderTop: `1px solid ${t.lightLine}`,
              transition: 'border-color 0.3s',
            }}
          >
            <p
              className="text-xs text-center leading-relaxed"
              style={{ color: t.footer, transition: 'color 0.3s' }}
            >
              {FOOTER_MESSAGES[footerIdx]}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
