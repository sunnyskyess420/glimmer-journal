'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  THEMES,
  WEEKLY_PROMPTS,
  TOAST_MESSAGES,
  type ThemeColors,
} from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { fetchReflection, saveReflection as saveReflectionSvc } from '@/lib/supabase-service';
import { localWeekStart } from '@/lib/utils';
import {
  loadZoneCheckIns,
  getWeeklyCheckInSummaryForWeek,
  type ZoneCheckInLog,
} from '@/lib/regulate-content';
import { exportWeekToPdf } from '@/lib/pdf-export';
import CheckInSummary from './CheckInSummary';

// Keep local getWeekStart for backward-compatibility inside this file — but
// delegate to the timezone-correct localWeekStart helper. Old version used
// toISOString() which returned UTC date and caused week boundaries to drift
// a day off from the user's local calendar.
function getWeekStart(date: Date): string {
  return localWeekStart(date);
}

function formatDateRange(weekStart: string): string {
  const start = new Date(weekStart + 'T12:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function WeeklyReflection() {
  const { theme, showToast, entries } = useJournalStore();
  const t: ThemeColors = THEMES[theme];

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [responses, setResponses] = useState(['', '', '']);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Zone check-in log — loaded once on mount. Used to show the gentle
  // weekly summary for the currently-displayed week, so the user (and
  // their therapist) can review the shape of their nervous-system week
  // alongside the written reflection.
  const [zoneLog, setZoneLog] = useState<ZoneCheckInLog>({});
  const [zoneLogReady, setZoneLogReady] = useState(false);
  useEffect(() => {
    setZoneLog(loadZoneCheckIns());
    setZoneLogReady(true);
  }, []);

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);

  // Per-week summary. Recomputes whenever the user navigates to a
  // different week OR the underlying log changes.
  const weeklySummary = useMemo(
    () => (zoneLogReady ? getWeeklyCheckInSummaryForWeek(weekStart, zoneLog) : null),
    [weekStart, zoneLog, zoneLogReady]
  );
  
  // Memoize week entries to prevent recalculating on every render
  const weekEntries = useMemo(() => 
    entries.filter((e) => {
      const ws = getWeekStart(new Date(e.date + 'T12:00:00'));
      return ws === weekStart;
    }), [entries, weekStart]
  );

  // Compute hasData based on both saved reflection and entries
  const hasData = useMemo(() => {
    return saved || weekEntries.length > 0;
  }, [saved, weekEntries.length]);

  useEffect(() => {
    setSaved(false);
    setResponses(['', '', '']);
    setLoading(true);

    (async () => {
      try {
        const data = await fetchReflection(weekStart);
        if (data?.responses) {
          setResponses(data.responses);
          setSaved(true);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [weekStart]);

  const goWeek = (dir: number) => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + dir * 7);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveReflectionSvc(weekStart, responses);
      setSaved(true);
      showToast(TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)]);
    } catch {
      showToast('Failed to save reflection.');
    } finally {
      setSaving(false);
    }
  };

  // Share this week as a PDF — focused, therapist-friendly export of just
  // the selected week: cover → check-in summary (with notes) → daily
  // entries → weekly reflection. Designed to be emailed ahead of a
  // session or pulled up on a tablet during one.
  const [sharing, setSharing] = useState(false);
  const user = useJournalStore((s) => s.user);

  const handleShareWeek = async () => {
    setSharing(true);
    try {
      // Get the latest responses from state — even if not saved yet.
      // (Users may want to share a draft with their therapist.)
      const result = await exportWeekToPdf(entries, {
        weekStart,
        userName: user?.name || user?.email,
        checkInSummary: weeklySummary,
        reflection: responses,
      });
      if (result.success) {
        showToast('PDF downloaded. Share it with your therapist.');
      } else {
        showToast('Could not export PDF. ' + (result.error || ''));
      }
    } catch {
      showToast('Could not export PDF.');
    } finally {
      setSharing(false);
    }
  };

  // Disable the share button if there's literally nothing this week —
  // no entries, no check-ins, no reflection answers. We don't want to
  // generate a 1-page empty cover for a week the user is just browsing.
  const hasAnythingToShare =
    weekEntries.length > 0 ||
    (weeklySummary && weeklySummary.total > 0) ||
    responses.some((r) => r && r.trim().length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div
          className="w-6 h-6 rounded-full animate-spin"
          style={{ border: `2px solid ${t.lightLine}`, borderTopColor: t.btnBg }}
        />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-6">
        {/* Week selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => goWeek(-1)}
            className="flex items-center justify-center rounded-lg"
            style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
            aria-label="Previous week"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span className="text-sm font-medium" style={{ color: t.text }}>
            {formatDateRange(weekStart)}
          </span>
          <button
            onClick={() => goWeek(1)}
            className="flex items-center justify-center rounded-lg"
            style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
            aria-label="Next week"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Gentle weekly check-in summary — show even on weeks with no
            written entries, because the user may still have tapped zones
            in Check-in. This gives the user (and their therapist) a real
            thing to look at together even without journaling. */}
        {weeklySummary && weeklySummary.total > 0 && (
          <div className="w-full max-w-2xl">
            <CheckInSummary summary={weeklySummary} periodNoun="that week" showDays />
          </div>
        )}

        {/* Share-this-week button — visible even on no-entry weeks if there
            are zone check-ins to share. The PDF will contain the cover +
            check-in summary (with notes) + (empty) weekly reflection. */}
        {hasAnythingToShare && (
          <button
            onClick={handleShareWeek}
            disabled={sharing}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: t.btnBg,
              color: t.btnFg,
              minHeight: 44,
              opacity: sharing ? 0.7 : 1,
            }}
          >
            {sharing ? (
              <>
                <div
                  className="w-4 h-4 rounded-full animate-spin"
                  style={{ border: `2px solid ${t.btnFg}`, borderTopColor: 'transparent' }}
                />
                Generating PDF…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" x2="12" y1="2" y2="15" />
                </svg>
                Share this week with my therapist
              </>
            )}
          </button>
        )}

        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: t.text }}>No entries this week</h3>
        <p className="text-sm text-center max-w-sm" style={{ color: t.muted }}>
          Add some daily entries this week, then come back here to reflect on patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: t.text }}>Weekly Reflection</h2>
        {saved && (
          <span className="text-xs" style={{ color: t.muted }}>✓ Saved</span>
        )}
      </div>

      {/* Week selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => goWeek(-1)}
          className="flex items-center justify-center rounded-lg"
          style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
          aria-label="Previous week"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <span className="text-sm font-medium" style={{ color: t.text }}>
          {formatDateRange(weekStart)}
        </span>
        <button
          onClick={() => goWeek(1)}
          className="flex items-center justify-center rounded-lg"
          style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
          aria-label="Next week"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* Gentle weekly check-in summary — surfaces the user's nervous-system
          week alongside the written reflection. Same component as the one
          on the Check-in tab, but scoped to the selected week (which may
          be a past one) so the user and their therapist can review any week
          together. */}
      {weeklySummary && weeklySummary.total > 0 && (
        <CheckInSummary summary={weeklySummary} periodNoun="that week" showDays />
      )}

      {/* Reflection prompts */}
      <div className="flex flex-col gap-4">
        {WEEKLY_PROMPTS.map((prompt, idx) => (
          <div
            key={idx}
            className="rounded-xl p-4 flex flex-col gap-2"
            style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}
          >
            <label className="text-sm font-medium" style={{ color: t.text }}>
              {prompt}
            </label>
            <textarea
              value={responses[idx]}
              onChange={(e) => {
                const next = [...responses];
                next[idx] = e.target.value;
                setResponses(next);
                setSaved(false);
              }}
              rows={3}
              className="w-full px-3 py-3 rounded-lg text-sm outline-none resize-y"
              style={{
                backgroundColor: t.hover,
                border: `1px solid ${t.lightLine}`,
                color: t.text,
                minHeight: 80,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = t.border)}
              onBlur={(e) => (e.currentTarget.style.borderColor = t.lightLine)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="self-start py-2.5 px-6 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: saving ? t.lightLine : t.btnBg,
            color: t.btnFg,
            minHeight: 44,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save reflection'}
        </button>

        {/* Share this week as a focused PDF for the therapist. */}
        <button
          onClick={handleShareWeek}
          disabled={sharing || !hasAnythingToShare}
          className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: sharing || !hasAnythingToShare ? t.lightLine : t.hover,
            color: sharing || !hasAnythingToShare ? t.muted : t.text,
            border: `1px solid ${t.lightLine}`,
            minHeight: 44,
            opacity: sharing || !hasAnythingToShare ? 0.7 : 1,
          }}
        >
          {sharing ? (
            <>
              <div
                className="w-4 h-4 rounded-full animate-spin"
                style={{ border: `2px solid ${t.text}`, borderTopColor: 'transparent' }}
              />
              Generating PDF…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
              Share this week with my therapist
            </>
          )}
        </button>
      </div>
    </div>
  );
}
