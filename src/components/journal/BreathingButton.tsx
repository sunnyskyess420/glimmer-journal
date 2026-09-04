'use client';

// Guided breathing button + modal.
//
// Six patterns are supported. Each is a named, well-known breath practice
// with its own timing and use-case:
//
//   - Box breathing       : In 4 · Hold 4 · Out 4 · Hold 4 — steadies attention
//                           during high alert (Navy SEAL / tactical)
//   - Calm hold           : In 4 · Hold 4 · Out 6 — gentle hold-then-release,
//                           calming without holding the out-breath
//   - Long exhale         : In 4 · Out 8 — longer out-breath cues safety,
//                           strong parasympathetic shift
//   - 4-7-8               : In 4 · Hold 7 · Out 8 — Dr. Andrew Weil's classic
//                           for sleep and acute anxiety
//   - Coherent            : In 5 · Out 5 — balanced ~6 breaths/min, used in
//                           stress-reduction and HRV training
//   - Physiological sigh  : In 5 · In 2 · Out 7 — double inhale through the
//                           nose, long exhale through the mouth; Huberman's
//                           go-to for in-the-moment stress relief
//
// The session runs indefinitely — the user taps "Stop" when they're done.
// The circle scales up on inhale, holds, scales down on exhale, holds. The
// CSS transition duration is synced to the current phase so the visual
// motion matches the count exactly.
//
// The user's last-used pattern is remembered across sessions via
// localStorage, so once they pick their preferred pattern it sticks.
// First-time users default to "Calm hold" (In 4 · Hold 4 · Out 6) — a
// gentle, accessible pattern that doesn't require holding the out-breath.

import { useEffect, useMemo, useRef, useState } from 'react';
import { THEMES, type ThemeColors } from '@/lib/constants';
import { useJournalStore } from '@/store/journal-store';

type Mode = 'box' | 'calm-hold' | 'long-exhale' | '4-7-8' | 'coherent' | 'physiological-sigh';

interface Phase {
  name: string;
  /** Length of the phase in seconds. */
  seconds: number;
  /** Visual scale of the breathing circle at the *end* of this phase. */
  scale: number;
}

interface Pattern {
  label: string;
  /** Short timing string shown in the picker (e.g., "In 4 · Hold 4 · Out 6"). */
  subtitle: string;
  /** One-line description of when/why to use this pattern. */
  description: string;
  phases: Phase[];
}

const PATTERNS: Record<Mode, Pattern> = {
  box: {
    label: 'Box breathing',
    subtitle: 'In 4 · Hold 4 · Out 4 · Hold 4',
    description: 'Steadies attention during high alert.',
    phases: [
      { name: 'Inhale', seconds: 4, scale: 1.35 },
      { name: 'Hold', seconds: 4, scale: 1.35 },
      { name: 'Exhale', seconds: 4, scale: 0.65 },
      { name: 'Hold', seconds: 4, scale: 0.65 },
    ],
  },
  'calm-hold': {
    label: 'Calm hold',
    subtitle: 'In 4 · Hold 4 · Out 6',
    description: 'Gentle hold-then-release, calming without holding the out-breath.',
    phases: [
      { name: 'Inhale', seconds: 4, scale: 1.35 },
      { name: 'Hold', seconds: 4, scale: 1.35 },
      { name: 'Exhale', seconds: 6, scale: 0.65 },
    ],
  },
  'long-exhale': {
    label: 'Long exhale',
    subtitle: 'In 4 · Out 8',
    description: 'Longer out-breath cues safety. Strong parasympathetic shift.',
    phases: [
      { name: 'Inhale', seconds: 4, scale: 1.35 },
      { name: 'Exhale', seconds: 8, scale: 0.65 },
    ],
  },
  '4-7-8': {
    label: '4-7-8',
    subtitle: 'In 4 · Hold 7 · Out 8',
    description: "Dr. Weil's classic for sleep and acute anxiety.",
    phases: [
      { name: 'Inhale', seconds: 4, scale: 1.35 },
      { name: 'Hold', seconds: 7, scale: 1.35 },
      { name: 'Exhale', seconds: 8, scale: 0.65 },
    ],
  },
  coherent: {
    label: 'Coherent',
    subtitle: 'In 5 · Out 5',
    description: 'Balanced ~6 breaths/min. Used in stress-reduction and HRV training.',
    phases: [
      { name: 'Inhale', seconds: 5, scale: 1.35 },
      { name: 'Exhale', seconds: 5, scale: 0.65 },
    ],
  },
  'physiological-sigh': {
    label: 'Physiological sigh',
    subtitle: 'In 5 · In 2 · Out 7',
    description: "Double inhale, long exhale. Huberman's go-to for acute stress.",
    phases: [
      { name: 'Inhale', seconds: 5, scale: 1.2 },
      { name: 'Inhale', seconds: 2, scale: 1.35 },
      { name: 'Exhale', seconds: 7, scale: 0.65 },
    ],
  },
};

const PATTERN_ORDER: Mode[] = [
  'box',
  'calm-hold',
  'long-exhale',
  '4-7-8',
  'coherent',
  'physiological-sigh',
];

// --- Last-used pattern persistence ----------------------------------------
// The user's pick sticks across sessions so they don't have to re-select
// their preferred pattern every time they open the modal. First-time
// users default to 'calm-hold' (the user's stated preference: In 4 · Hold 4 · Out 6).
const LAST_PATTERN_KEY = 'glimmer.breathing.lastPattern.v1';
const DEFAULT_MODE: Mode = 'calm-hold';

function loadLastPattern(): Mode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(LAST_PATTERN_KEY);
    if (!raw) return DEFAULT_MODE;
    // Validate that the stored value is still a known pattern (so old
    // values from previous versions don't crash if patterns were renamed).
    const valid: Mode[] = PATTERN_ORDER;
    return valid.includes(raw as Mode) ? (raw as Mode) : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

function saveLastPattern(mode: Mode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_PATTERN_KEY, mode);
  } catch {
    // best effort — storage may be blocked or full
  }
}

/**
 * Internal hook that drives the breathing animation cycle. Returns the
 * current phase, how many seconds are left in it, and how many full cycles
 * the user has completed. The cycle keeps running until `running` becomes
 * false (or the component unmounts).
 */
function useBreathingCycle(open: boolean, mode: Mode, running: boolean) {
  const phases = PATTERNS[mode].phases;
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsInPhase, setSecondsInPhase] = useState(0);
  const [cyclesDone, setCyclesDone] = useState(0);

  // Reset to the start of the pattern whenever the modal opens or the
  // user switches mode mid-session.
  useEffect(() => {
    if (!open) return;
    setPhaseIdx(0);
    setSecondsInPhase(0);
    setCyclesDone(0);
  }, [open, mode]);

  // Single 1-second ticker. We don't tick when the modal is closed or
  // the user has explicitly paused.
  useEffect(() => {
    if (!open || !running) return;
    const id = setInterval(() => {
      setSecondsInPhase((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [open, running, mode]);

  // When we've spent enough seconds in the current phase, advance.
  useEffect(() => {
    const phase = phases[phaseIdx];
    if (!phase) return;
    if (secondsInPhase >= phase.seconds) {
      setSecondsInPhase(0);
      setPhaseIdx((p) => {
        const next = (p + 1) % phases.length;
        if (next === 0) setCyclesDone((c) => c + 1);
        return next;
      });
    }
  }, [secondsInPhase, phaseIdx, phases]);

  const phase = phases[phaseIdx] ?? phases[0];
  const secondsLeft = Math.max(0, phase.seconds - secondsInPhase);

  return { phase, phaseIdx, secondsLeft, cyclesDone };
}

function BreathingModal({ onClose }: { onClose: () => void }) {
  const theme = useJournalStore((s) => s.theme);
  const t: ThemeColors = THEMES[theme];
  // On mount, load the user's last-used pattern (or the default).
  const [mode, setMode] = useState<Mode>(() => loadLastPattern());
  const [running, setRunning] = useState(true);

  const { phase, phaseIdx, secondsLeft, cyclesDone } = useBreathingCycle(true, mode, running);

  // The circle's visual scale is whatever scale the *current* phase ends on.
  // The CSS transition animates between the previous scale and this one.
  // We key the inner div on phaseIdx so the transition restarts cleanly
  // at the start of each phase (otherwise the browser may compress two
  // consecutive transitions into one when the phase changes).
  const scale = phase.scale;
  const transitionSeconds = phase.seconds;

  const pickMode = (m: Mode) => {
    setMode(m);
    setRunning(true);
    saveLastPattern(m);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Guided breathing"
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 flex flex-col items-center gap-5"
        style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (top-right) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 flex items-center justify-center rounded-full"
          style={{
            color: t.muted,
            minHeight: 44,
            minWidth: 44,
            transition: 'color 0.15s',
          }}
          aria-label="Close breathing exercise"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h2 className="text-lg font-semibold" style={{ color: t.text }}>
            {PATTERNS[mode].label}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: t.muted }}>{PATTERNS[mode].subtitle}</p>
          <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: t.muted, fontStyle: 'italic' }}>
            {PATTERNS[mode].description}
          </p>
        </div>

        {/* Breathing circle */}
        <div
          className="flex items-center justify-center"
          style={{ width: 200, height: 200 }}
          aria-live="polite"
        >
          <div
            key={`${phaseIdx}-${mode}`}
            className="rounded-full flex items-center justify-center"
            style={{
              width: 110,
              height: 110,
              backgroundColor: t.btnBg,
              color: t.btnFg,
              transform: `scale(${scale})`,
              transition: `transform ${transitionSeconds}s ease-in-out`,
            }}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-sm font-semibold">{phase.name}</span>
              <span className="text-3xl font-bold tabular-nums">{secondsLeft}</span>
            </div>
          </div>
        </div>

        {/* Cycle count + cue */}
        <div className="text-center">
          <p className="text-xs" style={{ color: t.muted }}>
            {cyclesDone === 0
              ? 'Follow the circle. Stop whenever you want.'
              : `${cyclesDone} ${cyclesDone === 1 ? 'cycle' : 'cycles'} — keep going as long as it helps.`}
          </p>
        </div>

        {/* Pause / resume */}
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: t.hover,
            color: t.text,
            border: `1px solid ${t.lightLine}`,
            minHeight: 44,
          }}
        >
          {running ? 'Pause' : 'Resume'}
        </button>

        {/* Mode picker — 2-column grid with pattern name + timing.
            Wraps onto multiple rows so all 6 patterns stay visible without
            scrolling, even on a small phone. The currently-active pattern
            uses the theme's button color so it's easy to spot. */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {PATTERN_ORDER.map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => pickMode(m)}
                aria-pressed={active}
                className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-left"
                style={{
                  backgroundColor: active ? t.btnBg : t.hover,
                  color: active ? t.btnFg : t.text,
                  border: active ? 'none' : `1px solid ${t.lightLine}`,
                  minHeight: 56,
                  transition: 'all 0.15s',
                }}
              >
                <span className="text-xs font-semibold leading-tight">{PATTERNS[m].label}</span>
                <span
                  className="text-[10px] leading-tight"
                  style={{ color: active ? t.btnFg : t.muted, opacity: active ? 0.85 : 1 }}
                >
                  {PATTERNS[m].subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stop button — full width, primary action */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{
            backgroundColor: t.btnBg,
            color: t.btnFg,
            minHeight: 44,
          }}
        >
          Stop
        </button>
      </div>
    </div>
  );
}

interface BreathingButtonProps {
  /** Optional label override for the trigger button. */
  label?: string;
  /** Optional compact trigger (no leading icon) — defaults to false. */
  variant?: 'pill' | 'inline';
  /** Optional class/style overrides for the trigger button. */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Default trigger: a pill-shaped "Breathe" button. Click it to open the
 * guided breathing modal. The modal owns its own state, so multiple
 * <BreathingButton /> instances can live on the same page without
 * interfering with each other (only one modal is open at a time).
 */
export default function BreathingButton({
  label = 'Breathe',
  variant = 'pill',
  className,
  style,
}: BreathingButtonProps) {
  const theme = useJournalStore((s) => s.theme);
  const t: ThemeColors = THEMES[theme];
  const [open, setOpen] = useState(false);

  const triggerStyle: React.CSSProperties = useMemo(() => {
    const base: React.CSSProperties = {
      backgroundColor: t.btnBg,
      color: t.btnFg,
      minHeight: 44,
      transition: 'background-color 0.15s, opacity 0.15s',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      cursor: 'pointer',
      ...style,
    };
    if (variant === 'inline') {
      return {
        ...base,
        padding: '8px 14px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 500,
      };
    }
    return {
      ...base,
      padding: '10px 18px',
      borderRadius: 999,
      fontSize: 14,
      fontWeight: 600,
    };
  }, [t, variant, style]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={triggerStyle}
        aria-label="Open guided breathing"
      >
        {/* Lungs / breath icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v10" />
          <path d="M9 8a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V8" />
          <path d="M15 8a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V8" />
        </svg>
        {label}
      </button>

      {open && <BreathingModal onClose={() => setOpen(false)} />}
    </>
  );
}
