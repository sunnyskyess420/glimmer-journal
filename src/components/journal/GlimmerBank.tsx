'use client';

import { useMemo } from 'react';
import { THEMES, type ThemeColors } from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { updateEntry as updateEntrySvc } from '@/lib/supabase-service';

export default function GlimmerBank() {
  const { theme, themeMode, entries } = useJournalStore();
  const t: ThemeColors = THEMES[theme][themeMode];

  const starred = useMemo(() => entries.filter((e) => e.starred), [entries]);

  const handleToggleStar = async (entry: typeof starred[0]) => {
    try {
      await updateEntrySvc(entry.id, { starred: false });
      useJournalStore.getState().updateEntry(entry.id, { starred: false });
    } catch {
      // best effort
    }
  };

  if (starred.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-4xl mb-4">✨</div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: t.text }}>Your Glimmer Bank is empty</h3>
        <p className="text-sm text-center max-w-sm" style={{ color: t.muted }}>
          Star your favorite entries to build a go-to list of things that reliably help you feel safe.
          Your future self will thank you.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold" style={{ color: t.text }}>
          ✨ Glimmer Bank
        </h2>
        <span className="text-sm" style={{ color: t.muted }}>
          {starred.length} starred {starred.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {starred.map((entry) => {
          const dots = Array.from({ length: 5 }, (_, i) => i < entry.intensity);
          return (
            <div
              key={entry.id}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{
                backgroundColor: t.cardBg,
                border: `1px solid ${t.lightLine}`,
                transition: 'background-color 0.3s, border-color 0.3s',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: t.muted }}>
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <span
                    className="inline-block text-xs font-medium mt-1 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: t.tagBg, color: t.tagFg }}
                  >
                    {entry.promptLabel}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleStar(entry)}
                  className="shrink-0 flex items-center justify-center rounded-lg"
                  style={{ color: t.starActive, minHeight: 44, minWidth: 44 }}
                  aria-label="Remove star"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              </div>
              <p className="text-sm line-clamp-3" style={{ color: t.text }}>
                {entry.response}
              </p>
              {entry.note && (
                <p className="text-xs italic line-clamp-2" style={{ color: t.muted }}>
                  · {entry.note}
                </p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Intensity dots */}
                <div className="flex items-center gap-1">
                  {dots.map((filled, i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: filled ? t.btnBg : t.lightLine,
                      }}
                    />
                  ))}
                </div>
                {/* State labels */}
                {entry.preState && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: t.hover, color: t.muted }}
                  >
                    {entry.preState}
                  </span>
                )}
                {entry.postState && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: t.hover, color: t.muted }}
                  >
                    → {entry.postState}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
