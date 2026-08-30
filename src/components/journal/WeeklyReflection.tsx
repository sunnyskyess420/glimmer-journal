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

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
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

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  
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
      <div className="flex flex-col items-center justify-center py-16 px-4">
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
    </div>
  );
}
