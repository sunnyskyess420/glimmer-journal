'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  THEMES,
  type ThemeColors,
} from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';
import { fetchAllReflections, type WeeklyReflectionRecord } from '@/lib/supabase-service';
import { exportJournalToPdf, type ExportOptions } from '@/lib/pdf-export';
import { localDateISO } from '@/lib/utils';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

type RangePreset = 'all' | '7' | '30' | '90' | 'ytd' | 'custom';

export default function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { theme, entries, stats, user, showToast } = useJournalStore();
  const t: ThemeColors = THEMES[theme];

  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [includeOverview, setIncludeOverview] = useState(true);
  const [includeEntries, setIncludeEntries] = useState(true);
  const [includeGlimmerBank, setIncludeGlimmerBank] = useState(true);
  const [includeWeekly, setIncludeWeekly] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [reflections, setReflections] = useState<WeeklyReflectionRecord[]>([]);

  // Pre-fill custom range with the data span when first opened
  const dataSpan = useMemo(() => {
    if (entries.length === 0) return { min: '', max: '' };
    const dates = entries.map((e) => e.date).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [entries]);

  useEffect(() => {
    if (open && reflections.length === 0) {
      fetchAllReflections()
        .then(setReflections)
        .catch(() => { /* best-effort */ });
    }
  }, [open, reflections.length]);

  if (!open) return null;

  // Resolve date range
  let startDate: string | undefined;
  let endDate: string | undefined;
  const today = new Date();
  if (rangePreset === '7') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    startDate = localDateISO(d);
  } else if (rangePreset === '30') {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    startDate = localDateISO(d);
  } else if (rangePreset === '90') {
    const d = new Date(today);
    d.setDate(d.getDate() - 89);
    startDate = localDateISO(d);
  } else if (rangePreset === 'ytd') {
    startDate = `${today.getFullYear()}-01-01`;
  } else if (rangePreset === 'custom') {
    startDate = customStart || undefined;
    endDate = customEnd || undefined;
  }

  const filteredCount = entries.filter((e) => {
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  }).length;

  const filteredReflections = reflections.filter((r) => {
    if (startDate && r.weekStart < startDate) return false;
    if (endDate && r.weekStart > endDate) return false;
    return true;
  });

  const anyContentSelected = includeOverview || includeEntries || includeGlimmerBank || includeWeekly;

  const handleExport = async () => {
    if (!anyContentSelected) {
      showToast('Select at least one section to include.');
      return;
    }
    setBusy(true);
    const opts: ExportOptions = {
      startDate,
      endDate,
      includeOverview,
      includeEntries,
      includeGlimmerBank,
      includeWeekly,
      note: note.trim() || undefined,
      userName: user?.name || user?.email,
    };
    const result = await exportJournalToPdf(entries, stats, reflections, opts);
    setBusy(false);
    if (result.success) {
      showToast('PDF downloaded. You can share it with your therapist.');
      onClose();
    } else {
      showToast('Could not export PDF. ' + (result.error || ''));
    }
  };

  const presetButton = (preset: RangePreset, label: string) => {
    const active = rangePreset === preset;
    return (
      <button
        type="button"
        onClick={() => setRangePreset(preset)}
        className="px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150"
        style={{
          backgroundColor: active ? t.btnBg : t.hover,
          color: active ? t.btnFg : t.text,
          border: active ? 'none' : `1px solid ${t.lightLine}`,
          minHeight: 36,
        }}
      >
        {label}
      </button>
    );
  };

  const checkboxRow = (
    checked: boolean,
    onChange: (v: boolean) => void,
    label: string,
    hint: string
  ) => (
    <label
      className="flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors"
      style={{ backgroundColor: checked ? t.hover : 'transparent' }}
    >
      <span
        className="flex items-center justify-center shrink-0 mt-0.5 rounded"
        style={{
          width: 22,
          height: 22,
          backgroundColor: checked ? t.btnBg : 'transparent',
          border: checked ? 'none' : `1.5px solid ${t.lightLine}`,
          color: t.btnFg,
        }}
      >
        {checked && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium" style={{ color: t.text }}>{label}</span>
        <span className="block text-xs mt-0.5" style={{ color: t.muted }}>{hint}</span>
      </span>
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: t.cardBg,
          border: `1px solid ${t.lightLine}`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{
            backgroundColor: t.cardBg,
            borderBottom: `1px solid ${t.lightLine}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>📄</span>
            <h2 className="text-base font-semibold" style={{ color: t.text }}>
              Export to PDF
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg"
            style={{ color: t.muted, minHeight: 36, minWidth: 36 }}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-5">
          <p className="text-sm" style={{ color: t.muted }}>
            Create a therapist-friendly PDF of your journal entries to bring to your next session.
          </p>

          {/* Date range */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: t.muted }}>Date range</p>
            <div className="flex flex-wrap gap-2">
              {presetButton('all', 'All time')}
              {presetButton('7', 'Last 7 days')}
              {presetButton('30', 'Last 30 days')}
              {presetButton('90', 'Last 90 days')}
              {presetButton('ytd', 'Year to date')}
              {presetButton('custom', 'Custom')}
            </div>
            {rangePreset === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: t.muted }}>From</span>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || dataSpan.max || undefined}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: t.hover,
                      border: `1px solid ${t.lightLine}`,
                      color: t.text,
                      minHeight: 40,
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs" style={{ color: t.muted }}>To</span>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart || dataSpan.min || undefined}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: t.hover,
                      border: `1px solid ${t.lightLine}`,
                      color: t.text,
                      minHeight: 40,
                    }}
                  />
                </label>
              </div>
            )}
            <p className="text-xs mt-2" style={{ color: t.muted }}>
              {filteredCount} entr{filteredCount === 1 ? 'y' : 'ies'}  ·  {filteredReflections.length} weekly reflection{filteredReflections.length === 1 ? '' : 's'} will be included.
            </p>
          </div>

          {/* Sections to include */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: t.muted }}>Include in PDF</p>
            <div className="flex flex-col gap-1">
              {checkboxRow(includeOverview, setIncludeOverview, 'Overview & stats', 'Summary card, state distribution, top tags')}
              {checkboxRow(includeEntries, setIncludeEntries, 'Daily entries', 'All chronological glimmer entries with full metadata')}
              {checkboxRow(includeGlimmerBank, setIncludeGlimmerBank, 'Glimmer Bank', 'Your starred entries — your go-to safety cues')}
              {checkboxRow(includeWeekly, setIncludeWeekly, 'Weekly reflections', 'Your weekly pattern review prompts')}
            </div>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: t.muted }}>
              Note to therapist (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything you'd like your therapist to know before reading — context, themes to focus on, etc."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
              style={{
                backgroundColor: t.hover,
                border: `1px solid ${t.lightLine}`,
                color: t.text,
                minHeight: 80,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-5 py-4 sticky bottom-0"
          style={{
            backgroundColor: t.cardBg,
            borderTop: `1px solid ${t.lightLine}`,
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: t.hover,
              color: t.muted,
              minHeight: 44,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={busy || !anyContentSelected}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              backgroundColor: busy || !anyContentSelected ? t.lightLine : t.btnBg,
              color: t.btnFg,
              minHeight: 44,
              opacity: busy || !anyContentSelected ? 0.7 : 1,
            }}
          >
            {busy ? (
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
