'use client';

import { THEMES, NS_STATES, type ThemeColors } from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';

export default function StatsView() {
  const { theme, themeMode, stats } = useJournalStore();
  const t: ThemeColors = THEMES[theme][themeMode];

  if (!stats || stats.total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: t.text }}>No data yet</h3>
        <p className="text-sm text-center max-w-sm" style={{ color: t.muted }}>
          Start tracking your glimmers and you'll see patterns emerge here.
          Even a few entries will begin to show insights.
        </p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total entries', value: stats.total },
    { label: 'Starred', value: stats.starred },
    { label: 'Current streak', value: `${stats.streak} days` },
    { label: 'Avg intensity', value: stats.avgIntensity.toFixed(1) },
  ];

  // Top tags (sorted by count)
  const topTags = Object.entries(stats.tagCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // State distribution
  const stateEntries = Object.entries(stats.stateCounts || {}).sort((a, b) => b[1] - a[1]);
  const maxStateCount = stateEntries.length > 0 ? stateEntries[0][1] : 1;

  // 7-day bar chart
  const last7 = stats.last7 || [];
  const maxCount = Math.max(...last7.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold" style={{ color: t.text }}>Stats</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4 text-center"
            style={{
              backgroundColor: t.cardBg,
              border: `1px solid ${t.lightLine}`,
              transition: 'background-color 0.3s, border-color 0.3s',
            }}
          >
            <p className="text-2xl font-bold" style={{ color: t.text }}>{card.value}</p>
            <p className="text-xs mt-1" style={{ color: t.muted }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* 7-day intensity trend */}
      {last7.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: t.cardBg,
            border: `1px solid ${t.lightLine}`,
          }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: t.text }}>
            7-Day Trend
          </h3>
          <div className="flex items-end gap-2" style={{ height: 120 }}>
            {last7.map((day) => {
              const barH = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                  style={{ height: '100%' }}
                >
                  {day.avgIntensity > 0 && (
                    <span className="text-xs" style={{ color: t.muted }}>
                      {day.avgIntensity.toFixed(1)}
                    </span>
                  )}
                  <div
                    className="w-full rounded-t-md transition-all duration-300"
                    style={{
                      height: `${Math.max(barH, 4)}%`,
                      backgroundColor: t.btnBg,
                      marginTop: 'auto',
                    }}
                  />
                  <span className="text-xs" style={{ color: t.muted }}>
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* State distribution */}
      {stateEntries.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: t.cardBg,
            border: `1px solid ${t.lightLine}`,
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: t.text }}>
            State Distribution
          </h3>
          <div className="flex flex-col gap-2">
            {stateEntries.map(([state, count]) => (
              <div key={state} className="flex items-center gap-3">
                <span className="text-xs w-20 shrink-0 text-right" style={{ color: t.muted }}>
                  {state}
                </span>
                <div
                  className="flex-1 h-5 rounded-full overflow-hidden"
                  style={{ backgroundColor: t.hover }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(count / maxStateCount) * 100}%`,
                      backgroundColor: t.btnBg,
                    }}
                  />
                </div>
                <span className="text-xs w-8 shrink-0" style={{ color: t.muted }}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top tags */}
      {topTags.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: t.cardBg,
            border: `1px solid ${t.lightLine}`,
          }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: t.text }}>
            Top Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: t.tagBg,
                  color: t.tagFg,
                  transition: 'background-color 0.3s, color 0.3s',
                }}
              >
                {tag} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
