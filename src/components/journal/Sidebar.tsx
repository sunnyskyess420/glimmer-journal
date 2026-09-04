'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  THEMES,
  THEME_ORDER,
  STREAK_MESSAGES,
  type ThemeName,
  type ThemeColors,
} from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { updateUserTheme } from '@/lib/supabase-service';
import {
  DEFAULT_REMINDER,
  formatReminderTime,
  getPermission,
  loadReminderSettings,
  notificationsSupported,
  requestPermission,
  saveReminderSettings,
  type ReminderSettings,
} from '@/lib/reminder';
import { checkAndFire } from '@/lib/reminder';
import ExportDialog from './ExportDialog';
import InstallHelpDialog from './InstallHelpDialog';

// Minimal type for the BeforeInstallPromptEvent — Chrome fires this but TS doesn't ship a type for it.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

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
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  // Daily reminder state — opt-in toggle + time picker. Persists to
  // localStorage so it survives reloads. The actual firing happens in
  // the `useReminder` hook mounted at the app root (Home.tsx); here we
  // just manage the settings.
  const [reminder, setReminder] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setReminder(loadReminderSettings());
    setPermission(getPermission());
  }, []);

  const updateReminder = (updates: Partial<ReminderSettings>) => {
    setReminder((prev) => {
      const next = { ...prev, ...updates };
      saveReminderSettings(next);
      // After changing settings, immediately run the check so the user
      // sees the effect without waiting for the next 5-min tick.
      // (willFire returns false if outside the window, so this is safe.)
      checkAndFire(next);
      return next;
    });
  };

  const handleEnableReminder = async () => {
    // Always request permission first. If the user denies, we still save
    // the "enabled" flag but no notifications will fire — the in-app
    // banner will still work (which we could wire later).
    if (getPermission() === 'default') {
      const result = await requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        // Permission denied — don't enable. The UI explains the state.
        return;
      }
    } else if (getPermission() === 'denied') {
      // Already denied at the browser level. Can't ask again.
      return;
    }
    updateReminder({ enabled: true });
  };

  const handleDisableReminder = () => {
    updateReminder({ enabled: false });
  };

  // Capture the beforeinstallprompt event so we can trigger install on demand.
  // Not all browsers fire this (notably iOS Safari never does, and Brave often
  // requires Shields to be off). When it doesn't fire, the user taps the
  // always-visible Install button and we show them manual instructions instead.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar so we control the flow
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    // If already running as installed PWA, hide the button entirely
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    // If the browser fired beforeinstallprompt, trigger the native install flow.
    if (installEvent) {
      installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
      setInstallEvent(null);
      return;
    }
    // Otherwise, show the manual install instructions for the user's browser.
    setInstallHelpOpen(true);
  };

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

        {/* Daily reminder for "One Small Thing" — opt-in.
            Honest about the platform limit: fires when the app is open
            OR when installed as a PWA on Chrome/Edge (background sync).
            iOS/Safari can only fire when the app is open. */}
        {notificationsSupported() && (
          <div className="mb-3">
            <p className="text-xs font-medium mb-2" style={{ color: t.muted }}>
              Daily reminder
            </p>

            {permission === 'denied' ? (
              <p className="text-xs leading-relaxed" style={{ color: t.muted }}>
                You blocked notifications for this site. To re-enable, open your
                browser's site settings and allow notifications, then come back here.
              </p>
            ) : (
              <>
                <div
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: t.hover }}
                >
                  <span className="text-sm" style={{ color: t.text }}>
                    {reminder.enabled
                      ? `Remind me at ${formatReminderTime(reminder)}`
                      : 'Remind me about today\u2019s small thing'}
                  </span>
                  <button
                    onClick={() =>
                      reminder.enabled ? handleDisableReminder() : handleEnableReminder()
                    }
                    aria-pressed={reminder.enabled}
                    className="rounded-full transition-colors shrink-0"
                    style={{
                      width: 40,
                      height: 22,
                      backgroundColor: reminder.enabled ? t.btnBg : t.lightLine,
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                    aria-label={reminder.enabled ? 'Disable reminder' : 'Enable reminder'}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: reminder.enabled ? 20 : 2,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF',
                        transition: 'left 0.15s',
                      }}
                    />
                  </button>
                </div>

                {/* Time picker — only visible once reminders are on,
                    so the first-time user sees a simple toggle. */}
                {reminder.enabled && (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs shrink-0" style={{ color: t.muted }}>
                      At
                    </label>
                    <input
                      type="time"
                      value={`${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(':').map((n) => parseInt(n, 10));
                        if (!Number.isNaN(h) && !Number.isNaN(m)) {
                          updateReminder({ hour: h, minute: m, lastNotifiedDate: null });
                        }
                      }}
                      className="px-2 py-1 rounded-md text-sm"
                      style={{
                        backgroundColor: t.hover,
                        border: `1px solid ${t.lightLine}`,
                        color: t.text,
                        minHeight: 36,
                      }}
                    />
                    <span className="text-xs" style={{ color: t.muted }}>
                      local time
                    </span>
                  </div>
                )}

                {reminder.enabled && (
                  <p className="text-[10px] mt-2 leading-relaxed" style={{ color: t.muted }}>
                    Fires when the app is open, or in the background when installed
                    as a PWA on Chrome/Edge. iOS Safari only fires when the app is open.
                  </p>
                )}
              </>
            )}
          </div>
        )}
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

      {/* Export + Install + Logout */}
      <div className="p-4 pt-2" style={{ borderTop: `1px solid ${t.lightLine}` }}>
        {/* Install app button — ALWAYS visible (unless already installed).
            If the browser supports beforeinstallprompt, tapping this triggers
            the native install dialog. If it doesn't (iOS Safari, Brave with
            Shields up, etc.), tapping it opens a manual install guide. */}
        {!installed && (
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 mb-2"
            style={{
              backgroundColor: t.btnBg,
              color: t.btnFg,
              minHeight: 44,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="m18 9-6 6-6-6" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            </svg>
            Install app
          </button>
        )}
        <button
          onClick={() => setExportOpen(true)}
          className="w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 mb-2"
          style={{
            backgroundColor: installed ? t.btnBg : t.hover,
            color: installed ? t.btnFg : t.text,
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
      <InstallHelpDialog open={installHelpOpen} onClose={() => setInstallHelpOpen(false)} />
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
