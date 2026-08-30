'use client';

import { useMemo, useState } from 'react';
import {
  THEMES,
  THEME_ORDER,
  STREAK_MESSAGES,
  type ThemeName,
  type ThemeColors,
} from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { updateUserTheme } from '@/lib/supabase-service';
import ExportDialog from './ExportDialog';

interface SidebarProps {
  onLogout: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const {
    user,
    theme,
    setTheme,
    stats,
    entries,
    selectedDate,
    setSelectedDate,
    sidebarOpen,
    setSidebarOpen,
  } = useJournalStore();

  const t: ThemeColors = THEMES[theme];
  const streak = stats?.streak ?? 0;
  const [exportOpen, setExportOpen] = useState(false);

  const uniqueDates = useMemo(() => 
    entries
      .map((e) => e.date)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b.localeCompare(a)),
    [entries]
  );

  const handleThemeChange = async (themeName: ThemeName) => {
    setTheme(themeName);
    try {
      await updateUserTheme(themeName);
    } catch {
      // best-effort
    }
  };

  const streakMsg =
    streak > 0
      ? STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)].replace('{n}', String(streak))
      : '';

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: t.panelBg, color: t.text, transition: 'background-color 0.3s, color 0.3s' }}
    >
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: t.text }}>
              {user?.name || user?.email}
            </p>
            {user?.name && (
              <p className="text-xs truncate" style={{ color: t.muted }}>{user.email}</p>
            )}
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden flex items-center justify-center rounded-lg"
            style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Streak */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
          style={{ backgroundColor: t.hover }}
        >
          <span className="text-lg" role="img" aria-label="streak">🔥</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: t.text }}>{streak}-day streak</p>
            {streak > 0 && streakMsg && (
              <p className="text-xs" style={{ color: t.muted }}>{streakMsg}</p>
            )}
          </div>
        </div>

        {/* Theme picker */}
        <div className="mb-3">
          <p className="text-xs font-medium mb-2" style={{ color: t.muted }}>Theme</p>
          <div className="flex gap-2">
            {THEME_ORDER.map((themeName) => {
              const isActive = theme === themeName;
              const themeColor = THEMES[themeName].btnBg;
              return (
                <button
                  key={themeName}
                  onClick={() => handleThemeChange(themeName)}
                  className="rounded-full transition-transform duration-150 hover:scale-110"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: themeColor,
                    border: isActive ? `3px solid ${t.text}` : `2px solid ${t.lightLine}`,
                    outline: 'none',
                    minWidth: 28,
                  }}
                  aria-label={`${themeName} theme`}
                  title={themeName}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Date list */}
      <div className="flex-1 overflow-y-auto px-4">
        <p className="text-xs font-medium mb-2" style={{ color: t.muted }}>Entries by date</p>
        {uniqueDates.length === 0 ? (
          <p className="text-xs" style={{ color: t.muted }}>No entries yet</p>
        ) : (
          <div className="flex flex-col gap-1">
            {uniqueDates.map((date) => {
              const isActive = selectedDate === date;
              const count = entries.filter((e) => e.date === date).length;
              return (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSidebarOpen(false);
                  }}
                  className="text-left px-3 py-2 rounded-lg text-sm transition-all duration-150"
                  style={{
                    backgroundColor: isActive ? t.select : 'transparent',
                    color: isActive ? t.text : t.muted,
                    minHeight: 44,
                  }}
                >
                  <span className="font-medium">{new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                  <span className="ml-2 text-xs" style={{ color: t.muted }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Export + Logout */}
      <div className="p-4 pt-2" style={{ borderTop: `1px solid ${t.lightLine}` }}>
        <button
          onClick={() => setExportOpen(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 mb-2"
          style={{
            backgroundColor: t.btnBg,
            color: t.btnFg,
            minHeight: 44,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Export to PDF
        </button>
        <button
          onClick={onLogout}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: t.hover,
            color: t.muted,
            minHeight: 44,
          }}
        >
          Log out
        </button>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen sticky top-0 w-60 shrink-0"
        style={{ borderRight: `1px solid ${t.lightLine}`, transition: 'border-color 0.3s' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSidebarOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-64"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
