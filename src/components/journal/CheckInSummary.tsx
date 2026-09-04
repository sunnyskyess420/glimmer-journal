'use client';

// Shared visual for the gentle check-in summary.
//
// Used in two places:
//   - Check-in tab: shows the last 7 days from today.
//   - Weekly tab: shows the selected week (Monday → Sunday).
//
// Both call sites compute the ZoneCheckInSummary themselves (different
// date ranges) and pass it in here, so this component is purely
// presentational — no date logic, no localStorage reads.

import { THEMES, type ThemeColors } from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { NS_ZONES, type ZoneId, type ZoneCheckInSummary } from '@/lib/regulate-content';

interface CheckInSummaryProps {
  summary: ZoneCheckInSummary;
  /** Override the wording for past weeks (e.g., "that week" vs "this week"). */
  periodNoun?: 'this week' | 'that week' | 'the week';
  /**
   * When true, render the day-by-day breakdown of check-ins (with any
   * optional notes) below the bar chart. The Weekly tab sets this to true
   * to give the richer, therapist-reviewable view; the Check-in tab keeps
   * it off to stay compact.
   */
  showDays?: boolean;
}

export default function CheckInSummary({
  summary,
  periodNoun = 'this week',
  showDays = false,
}: CheckInSummaryProps) {
  const theme = useJournalStore((s) => s.theme);
  const t: ThemeColors = THEMES[theme];

  if (summary.total === 0) return null;

  // Friendly name for the weekly summary's "mostly X" line.
  const zoneNameForSummary = (z: ZoneId | null): string | null => {
    if (!z) return null;
    const match = NS_ZONES.find((nz) => nz.id === z);
    return match ? match.name.toLowerCase() : null;
  };
  const topZoneName = zoneNameForSummary(summary.topZone);

  // Day-by-day list — only rendered when `showDays` is true AND there's
  // at least one day with a check-in. We render only days that have
  // entries to avoid a wall of empty "Monday —" rows.
  const daysWithEntries = summary.days.filter((d) => d.entries.length > 0);

  return (
    <section
      className="rounded-xl p-4"
      style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.muted }}>
        {periodNoun === 'this week'
          ? 'This week'
          : periodNoun === 'that week'
          ? 'That week'
          : 'The week'}
      </p>
      <p className="text-sm mt-1.5" style={{ color: t.text }}>
        You checked in {summary.total}{' '}
        {summary.total === 1 ? 'time' : 'times'} {periodNoun}
        {topZoneName ? <> — mostly in <span style={{ fontWeight: 600 }}>{topZoneName}</span></> : null}.
      </p>
      {/* Tiny per-zone bar so the user can see the shape of the week
          without numbers feeling clinical. */}
      <div className="flex items-center gap-1.5 mt-3">
        {NS_ZONES.map((z) => {
          const count = summary.byZone[z.id] ?? 0;
          const max = Math.max(
            summary.byZone.hyper,
            summary.byZone.window,
            summary.byZone.hypo,
            1
          );
          const width = (count / max) * 100;
          return (
            <div key={z.id} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-md"
                style={{
                  height: 36,
                  backgroundColor: t.hover,
                  border: `1px solid ${t.lightLine}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: '100%',
                    backgroundColor: t.btnBg,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: t.muted }}>{z.name}</span>
              <span className="text-[10px] font-medium" style={{ color: t.muted }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Day-by-day breakdown — only on the Weekly tab (showDays=true).
          Each row shows weekday + per-entry zone tag + optional note.
          This is the "real thing to look at together" view for therapy. */}
      {showDays && daysWithEntries.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${t.lightLine}` }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: t.muted }}>
            Check-ins by day
          </p>
          <div className="flex flex-col gap-2">
            {daysWithEntries.map((day) => (
              <div key={day.date}>
                <p className="text-xs font-medium" style={{ color: t.muted }}>
                  {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
                <div className="flex flex-col gap-1 mt-1">
                  {day.entries.map((entry, idx) => {
                    const zone = NS_ZONES.find((nz) => nz.id === entry.zone);
                    const zoneName = zone ? zone.name.toLowerCase() : entry.zone;
                    const timeStr = new Date(entry.ts).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    });
                    return (
                      <div key={idx} className="flex items-start gap-2 pl-3">
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: t.tagBg, color: t.tagFg }}
                        >
                          {zoneName}
                        </span>
                        <span
                          className="text-[10px] shrink-0 mt-1"
                          style={{ color: t.muted }}
                        >
                          {timeStr}
                        </span>
                        {entry.note && (
                          <span className="text-xs mt-0.5" style={{ color: t.text }}>
                            {entry.note}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
