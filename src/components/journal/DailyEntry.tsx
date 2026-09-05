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
    themeMode,
    entries,
    selectedDate,
    addEntry,
    updateEntry,
    showToast,
    showMilestone,
    totalEntries,
  } = useJournalStore();
  const t: ThemeColors = THEMES[theme][themeMode];

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
  // Optional one-line "what was happening" context — attached to the
  // entry. Stored alongside tags in the same Supabase column (smuggled
  // as a `_note` key) so no schema migration is needed.
  const [note, setNote] = useState('');

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
    setNote('');
    setSelectedPrompt(null);
    setEditingEntry(null);
  }, []);

  const handleSelectPrompt = useCallback((idx: number) => {
    // Always start a NEW entry. The user can feel "beautiful" more than
    // once a day, so tapping a prompt should never auto-load an existing
    // entry — it should always start a blank form. To edit an existing
    // entry, the user taps the edit button on that entry's card below.
    resetForm();
    setSelectedPrompt(idx);
  }, [resetForm]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t2) => t2 !== tag) : [...prev, tag]));
  };

  const handleSave = async (opts: { addAnother?: boolean } = {}) => {
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
        note: note.trim(),
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

      if (opts.addAnother) {
        // Save the current entry, then start a fresh blank form for the
        // SAME prompt. Lets the user chain multiple "beautiful" entries
        // without going back to the grid. We keep `selectedPrompt` set
        // so the form stays open; only the form fields reset.
        const keepPrompt = selectedPrompt;
        resetForm();
        setSelectedPrompt(keepPrompt);
      } else {
        resetForm();
      }
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

  // Load an existing entry into the form for editing. Triggered by the
  // edit button on an entry card below the prompt grid. (Tapping a
  // prompt in the grid above no longer auto-loads an existing entry —
  // that always starts a NEW one. This is the only path into edit mode.)
  const handleEditEntry = (entry: GlimmerEntry) => {
    setEditingEntry(entry);
    setPreState(entry.preState);
    setPostState(entry.postState);
    setIntensity(entry.intensity);
    setBodyLocation(entry.bodyLocation);
    try { setTags(JSON.parse(entry.tags || '[]')); } catch { setTags([]); }
    setSleepQuality(entry.sleepQuality);
    setStressLevel(entry.stressLevel);
    setDuration(entry.duration);
    setResponse(entry.response);
    setNote(entry.note || '');
    setSelectedPrompt(entry.promptIndex);
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
              // Count entries for this prompt on this date — the user can
              // have multiple per day now (e.g. feel "beautiful" twice).
              const entriesForPrompt = dateEntries.filter((e) => e.promptIndex === idx);
              const count = entriesForPrompt.length;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectPrompt(idx)}
                  className="text-left rounded-xl p-4 transition-all duration-150"
                  style={{
                    backgroundColor: t.cardBg,
                    border: count > 0 ? `2px solid ${t.btnBg}` : `1px solid ${t.lightLine}`,
                    color: t.text,
                    minHeight: 80,
                  }}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs mt-1" style={{ color: t.muted }}>
                    {count > 0
                      ? `${count} ${count === 1 ? 'entry' : 'entries'} saved · tap to add another`
                      : PROMPTS[idx]}
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
                    {entry.note && (
                      <p className="text-xs mt-1 italic truncate" style={{ color: t.muted }}>
                        · {entry.note}
                      </p>
                    )}
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
                      onClick={() => handleEditEntry(entry)}
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

          {/* What was happening? — optional one-line context attached to
              this glimmer. Auto-saves with the rest of the entry. Shows up
              in the Glimmer Bank and Stats so the user (and therapist) can
              see the context alongside the response. */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold" style={{ color: t.text }}>
              What was happening? <span style={{ color: t.muted, fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., at work, with a friend, after a call…"
              maxLength={140}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
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
          </div>

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

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleSave()}
              disabled={saving || !response.trim()}
              className="flex-1 min-w-[140px] py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: saving || !response.trim() ? t.lightLine : t.btnBg,
                color: t.btnFg,
                minHeight: 44,
                opacity: saving || !response.trim() ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : editingEntry ? 'Update entry' : 'Save glimmer'}
            </button>

            {/* "Save & add another" — only when creating a NEW entry (not
                when editing an existing one). Lets the user chain multiple
                entries for the same prompt (e.g. feel "beautiful" twice in
                a day) without going back to the prompt grid each time. */}
            {!editingEntry && (
              <button
                onClick={() => handleSave({ addAnother: true })}
                disabled={saving || !response.trim()}
                className="py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: 'transparent',
                  color: t.text,
                  border: `1px solid ${t.lightLine}`,
                  minHeight: 44,
                  opacity: saving || !response.trim() ? 0.5 : 1,
                }}
              >
                Save & add another
              </button>
            )}

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
