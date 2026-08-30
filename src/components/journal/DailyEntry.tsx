'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  THEMES,
  PROMPTS,
  SHORT_LABELS,
  NS_STATES,
  INTENSITY_LABELS,
  SLEEP_LABELS,
  STRESS_LABELS,
  DURATION_OPTIONS,
  BODY_LOCATIONS,
  TAG_GROUPS,
  SECTION_HELPERS,
  TOAST_MESSAGES,
  MILESTONES,
  type ThemeColors,
} from '@/lib/constants';
import { useJournalStore, type GlimmerEntry } from '@/store/journal-store';
import { createEntry, updateEntry as updateEntrySvc, deleteEntry as deleteEntrySvc, fetchStats } from '@/lib/supabase-service';

export default function DailyEntry() {
  const {
    theme,
    entries,
    selectedDate,
    addEntry,
    updateEntry,
    showToast,
    showMilestone,
    totalEntries,
  } = useJournalStore();
  const t: ThemeColors = THEMES[theme];

  const [selectedPrompt, setSelectedPrompt] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<GlimmerEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [preState, setPreState] = useState('');
  const [postState, setPostState] = useState('');
  const [intensity, setIntensity] = useState(0);
  const [bodyLocation, setBodyLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sleepQuality, setSleepQuality] = useState(0);
  const [stressLevel, setStressLevel] = useState(0);
  const [duration, setDuration] = useState('');
  const [response, setResponse] = useState('');

  const dateEntries = useMemo(() => entries.filter((e) => e.date === selectedDate), [entries, selectedDate]);

  const sectionsCompleted = useMemo(() => {
    if (selectedPrompt === null) return 0;
    let count = 0;
    if (preState) count++;
    if (intensity > 0) count++;
    if (bodyLocation) count++;
    if (tags.length > 0) count++;
    if (sleepQuality > 0 || stressLevel > 0) count++;
    return count;
  }, [selectedPrompt, preState, intensity, bodyLocation, tags, sleepQuality, stressLevel]);

  const resetForm = useCallback(() => {
    setPreState('');
    setPostState('');
    setIntensity(0);
    setBodyLocation('');
    setTags([]);
    setSleepQuality(0);
    setStressLevel(0);
    setDuration('');
    setResponse('');
    setSelectedPrompt(null);
    setEditingEntry(null);
  }, []);

  const handleSelectPrompt = useCallback((idx: number) => {
    // Check if there's already an entry for this prompt on this date
    const existing = dateEntries.find((e) => e.promptIndex === idx);
    if (existing) {
      setEditingEntry(existing);
      setPreState(existing.preState);
      setPostState(existing.postState);
      setIntensity(existing.intensity);
      setBodyLocation(existing.bodyLocation);
      try { setTags(JSON.parse(existing.tags || '[]')); } catch { setTags([]); }
      setSleepQuality(existing.sleepQuality);
      setStressLevel(existing.stressLevel);
      setDuration(existing.duration);
      setResponse(existing.response);
    } else {
      resetForm();
    }
    setSelectedPrompt(idx);
  }, [dateEntries, resetForm]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t2) => t2 !== tag) : [...prev, tag]));
  };

  const handleSave = async () => {
    if (selectedPrompt === null || !response.trim()) return;
    setSaving(true);

    try {
      const payload = {
        date: selectedDate,
        promptIndex: selectedPrompt,
        promptLabel: SHORT_LABELS[selectedPrompt],
        response: response.trim(),
        preState,
        postState,
        intensity,
        duration,
        bodyLocation,
        tags: JSON.stringify(tags),
        sleepQuality,
        stressLevel,
        starred: editingEntry?.starred ?? false,
      };

      if (editingEntry) {
        await updateEntrySvc(editingEntry.id, payload);
        updateEntry(editingEntry.id, payload);
      } else {
        const entry = await createEntry({ ...payload, tags });
        addEntry(entry);

        // Check milestones
        const newTotal = totalEntries + 1;
        if (MILESTONES[newTotal]) {
          showMilestone(MILESTONES[newTotal]);
        }
      }

      const msg = TOAST_MESSAGES[Math.floor(Math.random() * TOAST_MESSAGES.length)];
      showToast(msg);
      resetForm();
      // Refresh stats
      try {
        const stats = await fetchStats();
        useJournalStore.getState().setStats(stats);
      } catch { /* best effort */ }
    } catch {
      showToast('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStar = async (entry: GlimmerEntry) => {
    const newStarred = !entry.starred;
    try {
      await updateEntrySvc(entry.id, { starred: newStarred });
      updateEntry(entry.id, { starred: newStarred });
    } catch {
      // best effort
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntrySvc(id);
      useJournalStore.getState().removeEntry(id);
      if (editingEntry?.id === id) resetForm();
    } catch {
      // best effort
    }
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? t.btnBg : t.hover,
    color: active ? t.btnFg : t.text,
    border: active ? 'none' : `1px solid ${t.lightLine}`,
    minHeight: 44,
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Progress bar */}
      {selectedPrompt !== null && (
        <div className="rounded-lg p-3" style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: t.muted }}>
            <span>{sectionsCompleted}/5 sections</span>
            <span>{SHORT_LABELS[selectedPrompt]}</span>
          </div>
          <div className="w-full h-2 rounded-full" style={{ backgroundColor: t.hover }}>
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(sectionsCompleted / 5) * 100}%`,
                backgroundColor: t.btnBg,
              }}
            />
          </div>
        </div>
      )}

      {/* Prompt grid or Entry form */}
      {selectedPrompt === null ? (
        <>
          <h2 className="text-lg font-semibold" style={{ color: t.text }}>
            What felt good today?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORT_LABELS.map((label, idx) => {
              const hasEntry = dateEntries.some((e) => e.promptIndex === idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectPrompt(idx)}
                  className="text-left rounded-xl p-4 transition-all duration-150"
                  style={{
                    backgroundColor: t.cardBg,
                    border: hasEntry ? `2px solid ${t.btnBg}` : `1px solid ${t.lightLine}`,
                    color: t.text,
                    minHeight: 80,
                  }}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs mt-1" style={{ color: t.muted }}>
                    {hasEntry ? '✓ Entry saved' : PROMPTS[idx]}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Existing entries for date */}
          {dateEntries.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <h3 className="text-sm font-medium" style={{ color: t.muted }}>
                Entries for {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </h3>
              {dateEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl p-4 flex items-start justify-between gap-3"
                  style={{
                    backgroundColor: t.cardBg,
                    border: `1px solid ${t.lightLine}`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: t.muted }}>{entry.promptLabel}</span>
                      <span className="text-xs" style={{ color: t.muted }}>Intensity: {entry.intensity}</span>
                    </div>
                    <p className="text-sm mt-1 truncate" style={{ color: t.text }}>{entry.response}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleStar(entry)}
                      className="flex items-center justify-center rounded-lg"
                      style={{ color: entry.starred ? t.starActive : t.star, minHeight: 44, minWidth: 44 }}
                      aria-label="Toggle star"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={entry.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleSelectPrompt(entry.promptIndex)}
                      className="flex items-center justify-center rounded-lg text-xs"
                      style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
                      aria-label="Edit entry"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="flex items-center justify-center rounded-lg text-xs"
                      style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
                      aria-label="Delete entry"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Back button + title */}
          <div className="flex items-center gap-3">
            <button
              onClick={resetForm}
              className="flex items-center justify-center rounded-lg"
              style={{ color: t.muted, minHeight: 44, minWidth: 44 }}
              aria-label="Back to prompts"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <h3 className="text-base font-semibold" style={{ color: t.text }}>{SHORT_LABELS[selectedPrompt]}</h3>
          </div>

          {/* Full prompt text */}
          <p className="text-sm italic" style={{ color: t.muted }}>{PROMPTS[selectedPrompt]}</p>

          {/* Section 1: Nervous System State */}
          <section className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}>
            <h4 className="text-sm font-semibold">Nervous System State</h4>
            <div>
              <p className="text-xs mb-2" style={{ color: t.muted }}>Before the glimmer</p>
              <div className="flex flex-wrap gap-2">
                {NS_STATES.map((state) => (
                  <button
                    key={`pre-${state}`}
                    onClick={() => setPreState(preState === state ? '' : state)}
                    style={toggleBtnStyle(preState === state)}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: t.muted }}>After the glimmer</p>
              <div className="flex flex-wrap gap-2">
                {NS_STATES.map((state) => (
                  <button
                    key={`post-${state}`}
                    onClick={() => setPostState(postState === state ? '' : state)}
                    style={toggleBtnStyle(postState === state)}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs" style={{ color: t.muted }}>{SECTION_HELPERS[1]}</p>
          </section>

          {/* Section 2: Intensity */}
          <section className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}>
            <h4 className="text-sm font-semibold">Intensity</h4>
            <div className="flex gap-3 items-end">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setIntensity(intensity === level ? 0 : level)}
                  className="flex flex-col items-center gap-1"
                  style={{
                    color: intensity === level ? t.btnBg : t.muted,
                    transition: 'color 0.15s',
                  }}
                >
                  <div
                    className="rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      width: 44,
                      height: 44,
                      backgroundColor: intensity === level ? t.btnBg : t.hover,
                      color: intensity === level ? t.btnFg : t.text,
                      border: intensity === level ? 'none' : `1px solid ${t.lightLine}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    {level}
                  </div>
                  <span className="text-xs">{INTENSITY_LABELS[level - 1]}</span>
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: t.muted }}>{SECTION_HELPERS[2]}</p>
          </section>

          {/* Section 3: Body Location */}
          <section className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}>
            <h4 className="text-sm font-semibold">Body Location</h4>
            <div className="flex flex-wrap gap-2">
              {BODY_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setBodyLocation(bodyLocation === loc ? '' : loc)}
                  style={toggleBtnStyle(bodyLocation === loc)}
                >
                  {loc}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: t.muted }}>{SECTION_HELPERS[3]}</p>
          </section>

          {/* Section 4: Context Tags */}
          <section className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}>
            <h4 className="text-sm font-semibold">Context Tags</h4>
            {Object.entries(TAG_GROUPS).map(([group, items]) => (
              <div key={group}>
                <p className="text-xs mb-2 font-medium" style={{ color: t.muted }}>{group}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={toggleBtnStyle(tags.includes(tag))}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs" style={{ color: t.muted }}>{SECTION_HELPERS[4]}</p>
          </section>

          {/* Section 5: Sleep + Stress + Duration */}
          <section className="rounded-xl p-4 flex flex-col gap-4" style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}>
            <h4 className="text-sm font-semibold">Sleep & Stress</h4>
            <div>
              <p className="text-xs mb-2" style={{ color: t.muted }}>Sleep quality</p>
              <div className="flex flex-wrap gap-2">
                {SLEEP_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => setSleepQuality(sleepQuality === idx + 1 ? 0 : idx + 1)}
                    style={toggleBtnStyle(sleepQuality === idx + 1)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: t.muted }}>Stress level</p>
              <div className="flex flex-wrap gap-2">
                {STRESS_LABELS.map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => setStressLevel(stressLevel === idx + 1 ? 0 : idx + 1)}
                    style={toggleBtnStyle(stressLevel === idx + 1)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: t.muted }}>Duration of glimmer</p>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setDuration(duration === opt ? '' : opt)}
                    style={toggleBtnStyle(duration === opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs" style={{ color: t.muted }}>{SECTION_HELPERS[5]}</p>
          </section>

          {/* Response textarea */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: t.text }}>
              Your glimmer
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Describe what you noticed..."
              rows={5}
              className="w-full px-3 py-3 rounded-xl text-sm outline-none resize-y"
              style={{
                backgroundColor: t.hover,
                border: `1px solid ${t.lightLine}`,
                color: t.text,
                minHeight: 120,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = t.border)}
              onBlur={(e) => (e.currentTarget.style.borderColor = t.lightLine)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !response.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: saving || !response.trim() ? t.lightLine : t.btnBg,
                color: t.btnFg,
                minHeight: 44,
                opacity: saving || !response.trim() ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : editingEntry ? 'Update entry' : 'Save glimmer'}
            </button>
            {editingEntry && (
              <button
                onClick={() => handleToggleStar(editingEntry)}
                className="flex items-center justify-center rounded-xl"
                style={{
                  border: `1px solid ${t.lightLine}`,
                  color: editingEntry.starred ? t.starActive : t.star,
                  minHeight: 44,
                  minWidth: 44,
                  transition: 'color 0.15s',
                }}
                aria-label="Toggle star"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={editingEntry.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
