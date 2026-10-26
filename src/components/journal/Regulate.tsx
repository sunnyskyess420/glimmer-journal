'use client';

import { useEffect, useMemo, useState } from 'react';
import { THEMES, PRACTICE_MILESTONES, type ThemeColors } from '@/lib/constants';
import {
  NS_ZONES,
  RECIPES,
  ENERGY_PICKS,
  CHECKIN_INTRO,
  RECOVERY_RULE,
  PRACTICE_TOASTS,
  ONE_SMALL_THING_INTRO,
  ONE_SMALL_THING_DONE,
  loadPracticeLog,
  savePracticeLog,
  recentDates,
  pickDailyOneSmallThing,
  loadShownPracticeMilestones,
  markPracticeMilestoneShown,
  getPracticeStreakDays,
  getTotalPracticeCount,
  type ZoneId,
  type PracticeLog,
} from '@/lib/regulate-content';
import { useJournalStore } from '@/store/journal-store';
import BreathingButton from './BreathingButton';

// Shared practice log. Both pages (Check-in and Toolbox) read and write the
// same localStorage log, so a skill marked done on one page shows up in the
// other page's counts the next time you open it.
function usePracticeLog() {
  const { showToast, showMilestone } = useJournalStore();
  const [log, setLog] = useState<PracticeLog>({});
  const [logReady, setLogReady] = useState(false);

  useEffect(() => {
    setLog(loadPracticeLog());
    setLogReady(true);
  }, []);

  const doneToday = useMemo(
    () => new Set(logReady ? log[localToday()] ?? [] : []),
    [log, logReady]
  );
  const todayCount = doneToday.size;
  const weekCount = useMemo(() => {
    if (!logReady) return 0;
    return recentDates(7).reduce((n, d) => n + (log[d]?.length ?? 0), 0);
  }, [log, logReady]);

  const toggle = (skill: string) => {
    const today = localToday();
    const updated = { ...log };
    const list = [...(updated[today] ?? [])];
    const isAdding = !list.includes(skill);
    if (isAdding) {
      list.push(skill);
      updated[today] = list;
      const msg = PRACTICE_TOASTS[Math.floor(Math.random() * PRACTICE_TOASTS.length)];
      showToast(msg);
      // Fire practice milestones for the *doing*, not just the journaling.
      // We check after the addition so today's count and the streak include
      // this latest rep.
      checkPracticeMilestones(updated, showMilestone);
    } else {
      updated[today] = list.filter((s) => s !== skill);
    }
    setLog(updated);
    savePracticeLog(updated);
  };

  return { doneToday, todayCount, weekCount, toggle };
}

// Celebrate practice milestones the first time the user hits each threshold.
// "First time ever" is tracked in localStorage so each milestone only fires
// its popup once across all sessions and devices-on-this-browser.
function checkPracticeMilestones(
  log: PracticeLog,
  showMilestone: (msg: string) => void
) {
  const shown = loadShownPracticeMilestones();
  const today = localToday();
  const todayCount = log[today]?.length ?? 0;

  // Order matters — show one at a time, highest-threshold first so a user
  // who's been practicing quietly for a while sees the most significant
  // celebration first, then the smaller ones later.
  const streak = getPracticeStreakDays(log);
  const total = getTotalPracticeCount(log);

  type Candidate = { key: string; message: string };
  const candidates: Candidate[] = [];

  if (total >= 25 && !shown['twentyFiveSkills']) {
    candidates.push({ key: 'twentyFiveSkills', message: PRACTICE_MILESTONES.twentyFiveSkills });
  }
  if (streak >= 10 && !shown['tenDayStreak']) {
    candidates.push({ key: 'tenDayStreak', message: PRACTICE_MILESTONES.tenDayStreak });
  }
  if (streak >= 5 && !shown['fiveDayStreak']) {
    candidates.push({ key: 'fiveDayStreak', message: PRACTICE_MILESTONES.fiveDayStreak });
  }
  if (todayCount >= 3 && !shown['firstThreeInDay']) {
    candidates.push({ key: 'firstThreeInDay', message: PRACTICE_MILESTONES.firstThreeInDay });
  }
  // The very first practice rep deserves the same welcome the first journal
  // entry already gets. `firstPractice` fires when cumulative total hits 1
  // (i.e., the user just logged their first ever skill). It's checked last
  // because it's the smallest threshold, but for a brand-new user it's the
  // only one that will fire — and we want it to fire on its own without
  // competing with higher-threshold ones (which can't trigger on the first
  // rep anyway, since todayCount would also be 1, not 3).
  if (total === 1 && !shown['firstPractice']) {
    candidates.push({ key: 'firstPractice', message: PRACTICE_MILESTONES.firstPractice });
  }

  if (candidates.length > 0) {
    // Pop the highest-priority candidate only — let the user enjoy the moment
    // before we pile on more celebrations.
    const next = candidates[0];
    markPracticeMilestoneShown(next.key);
    showMilestone(next.message);
  }
}

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// --- Shared bits -------------------------------------------------------------

function DoneButton({
  done,
  onToggle,
  cardBg,
}: {
  done: boolean;
  onToggle: () => void;
  cardBg: string;
}) {
  const t: ThemeColors = THEMES[useJournalStore((s) => s.theme)][useJournalStore((s) => s.themeMode)];
  return (
    <button
      onClick={onToggle}
      aria-pressed={done}
      className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium"
      style={{
        minHeight: 44,
        minWidth: 92,
        padding: '0 14px',
        backgroundColor: done ? t.btnBg : cardBg,
        color: done ? t.btnFg : t.text,
        border: done ? 'none' : `1px solid ${t.lightLine}`,
        transition: 'all 0.15s',
      }}
    >
      {done && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {done ? 'Done' : 'Mark done'}
    </button>
  );
}

function SkillRow({
  skill,
  first,
  dividerColor,
  done,
  onToggle,
}: {
  skill: string;
  first: boolean;
  dividerColor: string;
  done: boolean;
  onToggle: () => void;
}) {
  const t: ThemeColors = THEMES[useJournalStore((s) => s.theme)][useJournalStore((s) => s.themeMode)];
  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5"
      style={{ borderTop: first ? 'none' : `1px solid ${dividerColor}` }}
    >
      <span className="text-sm" style={{ color: t.text }}>{skill}</span>
      <DoneButton done={done} onToggle={onToggle} cardBg={t.hover} />
    </div>
  );
}

// --- Page 1: Check-in --------------------------------------------------------

export function CheckIn() {
  const { theme, themeMode } = useJournalStore();
  const setActiveTab = useJournalStore((s) => s.setActiveTab);
  const t: ThemeColors = THEMES[theme][themeMode];
  const { doneToday, toggle } = usePracticeLog();

  const [zone, setZone] = useState<ZoneId | null>(null);

  // Tapping a zone just shows its detail panel — it does NOT create a
  // stat. Only marking a skill done (the "Mark done" button inside the
  // panel) creates a logged practice entry. The user explicitly asked
  // for this: clicking a zone to see what's there isn't the same as
  // doing the work. So `handleZoneTap` just toggles the selection.
  const handleZoneTap = (z: { id: ZoneId }, currentlySelected: boolean) => {
    setZone(currentlySelected ? null : z.id);
  };

  // Concrete, loggable actions shown in the detail panel for the selected zone.
  const tryNow = useMemo(() => {
    if (!zone) return [];
    const z = NS_ZONES.find((x) => x.id === zone);
    if (!z) return [];
    const [a, b] = z.matchingRecipes;
    const ra = RECIPES.find((r) => r.id === a);
    const rb = RECIPES.find((r) => r.id === b);
    return [...(ra ? ra.skills.slice(0, 3) : []), ...(rb ? rb.skills.slice(0, 1) : [])].slice(0, 4);
  }, [zone]);

  const activeZone = zone ? NS_ZONES.find((z) => z.id === zone) ?? null : null;

  // "One Small Thing" — deterministic per-day pick from Daily Maintenance +
  // Quick Starters. Stays the same all day, changes at midnight local.
  // This is the "remember to actually do it" piece: no deciding, no
  // scrolling — the day's work is chosen for the user.
  const todaysPick = useMemo(() => pickDailyOneSmallThing(), []);
  const todaysPickDone = doneToday.has(todaysPick);

  return (
    <div className="flex flex-col gap-6">
      {/* One Small Thing — picked fresh each day, always at the top.
          The whole point: no deciding, no scrolling. The day's work is
          chosen for you. Just do it, then tap Mark done. */}
      <section
        className="rounded-xl p-4"
        style={{
          backgroundColor: t.cardBg,
          border: `2px solid ${todaysPickDone ? t.lightLine : t.btnBg}`,
          opacity: todaysPickDone ? 0.75 : 1,
          transition: 'all 0.2s',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: t.muted }}
            >
              One small thing today
            </p>
            <p className="text-base font-semibold mt-1.5" style={{ color: t.text }}>
              {todaysPick}
            </p>
            <p className="text-xs mt-1.5" style={{ color: t.muted }}>
              {todaysPickDone ? ONE_SMALL_THING_DONE : ONE_SMALL_THING_INTRO}
            </p>
          </div>
          <DoneButton
            done={todaysPickDone}
            onToggle={() => toggle(todaysPick)}
            cardBg={t.hover}
          />
        </div>
      </section>

      {/* Guided breathing — a real, animated breathing circle you can open
          in the hard moment. Tap and it walks you through box breathing
          or the long-exhale version, at your pace, for as long as you
          want. Instead of reading "try slow exhale breathing," you just
          do it, right there. */}
      <section
        className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
        style={{ backgroundColor: t.hover, border: `1px solid ${t.lightLine}` }}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold" style={{ color: t.text }}>
            Need a moment?
          </h2>
          <p className="text-xs mt-1" style={{ color: t.muted }}>
            Open the breathing circle and follow it for as long as you want.
          </p>
        </div>
        <BreathingButton />
      </section>

      {/* Window of Tolerance check-in */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: t.text }}>
            Where are you right now?
          </h2>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: t.muted }}>{CHECKIN_INTRO}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Zone stack: hyper on top, window in the middle, hypo below */}
          <div className="flex flex-col gap-2" role="group" aria-label="Nervous system zones">
            {NS_ZONES.map((z) => {
              const selected = zone === z.id;
              return (
                <button
                  key={z.id}
                  onClick={() => handleZoneTap(z, selected)}
                  aria-pressed={selected}
                  className="w-full text-left rounded-xl px-4 flex flex-col justify-center"
                  style={{
                    minHeight: 68,
                    backgroundColor: selected ? t.select : t.cardBg,
                    border: z.id === 'window' ? `2px solid ${t.border}` : `1px solid ${t.lightLine}`,
                    transition: 'background-color 0.15s, border-color 0.15s',
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: t.text }}>{z.name}</span>
                  <span className="text-xs mt-0.5" style={{ color: t.muted }}>{z.subtitle}</span>
                </button>
              );
            })}
          </div>

          {/* Zone detail panel */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}
          >
            {!activeZone ? (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4">
                <p className="text-sm font-medium" style={{ color: t.text }}>
                  Tap a zone that matches your body right now
                </p>
                <p className="text-xs mt-1.5" style={{ color: t.muted }}>
                  No wrong answers. Naming the state is the practice.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-semibold" style={{ color: t.text }}>{activeZone.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: t.muted }}>{activeZone.feelLine}</p>
                </div>

                {/* Breathing button — show only when the user is outside
                    their window (hyper/hypo). Inside the window they don't
                    need to "breathe to calm down"; outside, it's exactly
                    the right tool. */}
                {activeZone.id !== 'window' && (
                  <div
                    className="rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap"
                    style={{ backgroundColor: t.hover, border: `1px solid ${t.lightLine}` }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: t.text }}>
                        Breathe with me first
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: t.muted }}>
                        30 seconds of guided breathing before trying anything else.
                      </p>
                    </div>
                    <BreathingButton variant="inline" />
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold">{activeZone.listTitle}</h4>
                  <ul className="flex flex-col gap-1.5 mt-2">
                    {activeZone.listItems.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span
                          className="rounded-full shrink-0"
                          style={{ width: 4, height: 4, backgroundColor: t.muted, marginTop: 8 }}
                        />
                        <span className="text-sm" style={{ color: t.text }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-semibold">{activeZone.strategiesTitle}</h4>
                  <ul className="flex flex-col gap-1.5 mt-2">
                    {activeZone.strategies.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span
                          className="rounded-full shrink-0"
                          style={{ width: 4, height: 4, backgroundColor: t.muted, marginTop: 8 }}
                        />
                        <span className="text-sm" style={{ color: t.text }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs italic mt-2" style={{ color: t.muted }}>{activeZone.outcome}</p>
                </div>

                {/* Loggable actions from the matching coping menu */}
                <div
                  className="rounded-lg p-3"
                  style={{ backgroundColor: t.hover, border: `1px solid ${t.lightLine}` }}
                >
                  <h4 className="text-sm font-semibold">
                    {activeZone.id === 'window' ? 'Keep the streak of feeling okay' : 'Try one now'}
                  </h4>
                  <div className="flex flex-col mt-1">
                    {tryNow.map((skill, idx) => (
                      <SkillRow
                        key={skill}
                        skill={skill}
                        first={idx === 0}
                        dividerColor={t.lightLine}
                        done={doneToday.has(skill)}
                        onToggle={() => toggle(skill)}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => setActiveTab('toolbox')}
                      className="text-xs font-medium px-3 rounded-lg inline-flex items-center gap-1.5"
                      style={{
                        minHeight: 44,
                        backgroundColor: t.cardBg,
                        color: t.text,
                        border: `1px solid ${t.lightLine}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      Open the full Toolbox
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Bridge to the Daily Entry vocabulary */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs" style={{ color: t.muted }}>Daily Entry states that fit here:</span>
                  {activeZone.matchingStates.map((state) => (
                    <span
                      key={state}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: t.tagBg, color: t.tagFg }}
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recovery rule */}
        <section
          className="rounded-xl p-4"
          style={{ backgroundColor: t.hover, border: `1px solid ${t.border}` }}
        >
          <h3 className="text-sm font-semibold" style={{ color: t.text }}>{RECOVERY_RULE.title}</h3>
          <p className="text-sm mt-1.5" style={{ color: t.muted }}>
            {RECOVERY_RULE.body}{' '}
            <span className="font-semibold" style={{ color: t.text }}>{RECOVERY_RULE.emphasis}</span>
          </p>
        </section>
      </section>
    </div>
  );
}

// --- Page 2: Toolbox ---------------------------------------------------------

export function Toolbox() {
  const { theme, themeMode } = useJournalStore();
  const t: ThemeColors = THEMES[theme][themeMode];
  const { doneToday, todayCount, toggle } = usePracticeLog();

  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [energy, setEnergy] = useState<string | null>(null);

  const highlightedRecipes = useMemo(() => {
    if (!energy) return new Set<string>();
    const pick = ENERGY_PICKS.find((p) => p.id === energy);
    return new Set(pick ? pick.recipeIds : []);
  }, [energy]);

  const handleEnergyPick = (id: string) => {
    if (energy === id) {
      setEnergy(null);
      return;
    }
    setEnergy(id);
    const pick = ENERGY_PICKS.find((p) => p.id === id);
    if (pick && pick.recipeIds.length > 0) {
      setOpenRecipe(pick.recipeIds[0]);
    }
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
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
    <div className="flex flex-col gap-6">
      {/* Heading + today's count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: t.text }}>
            Toolbox
          </h2>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: t.muted }}>
            Pick one skill, not five. After using it, notice whether your body feels calmer, more grounded, or slightly lighter.
          </p>
        </div>
        <span className="text-xs shrink-0" style={{ color: t.muted }}>{todayCount} tried today</span>
      </div>

      {/* Guided breathing — first card in the Toolbox, because it's the
          single most useful thing in the hard moment and doesn't require
          any setup or scrolling. */}
      <section
        className="rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap"
        style={{
          backgroundColor: t.cardBg,
          border: `2px solid ${t.border}`,
        }}
      >
        <div className="min-w-0">
          <h3 className="text-base font-semibold" style={{ color: t.text }}>
            Guided breathing
          </h3>
          <p className="text-sm mt-1" style={{ color: t.muted }}>
            An animated circle walks you through box breathing or the long-exhale version, at your pace, for as long as you want.
          </p>
        </div>
        <BreathingButton label="Start breathing" />
      </section>

      {/* Choose by energy level */}
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: t.muted }}>Choose based on how you feel right now</p>
        <div className="flex flex-wrap gap-2">
          {ENERGY_PICKS.map((pick) => (
            <button
              key={pick.id}
              onClick={() => handleEnergyPick(pick.id)}
              aria-pressed={energy === pick.id}
              style={chipStyle(energy === pick.id)}
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipe accordion */}
      <div className="flex flex-col gap-3">
        {RECIPES.map((recipe) => {
          const open = openRecipe === recipe.id;
          const highlighted = highlightedRecipes.has(recipe.id);
          return (
            <div
              key={recipe.id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: t.cardBg,
                border: highlighted ? `2px solid ${t.border}` : `1px solid ${t.lightLine}`,
                transition: 'border-color 0.15s',
              }}
            >
              <button
                onClick={() => setOpenRecipe(open ? null : recipe.id)}
                aria-expanded={open}
                className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                style={{ minHeight: 56 }}
              >
                <div className="min-w-0">
                  <span className="text-sm font-semibold" style={{ color: t.text }}>{recipe.name}</span>
                  <span className="text-xs ml-2" style={{ color: t.muted }}>{recipe.subtitle}</span>
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={t.muted}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {open && (
                <div className="px-4 pb-4">
                  <div className="flex flex-col">
                    {recipe.skills.map((skill, idx) => (
                      <SkillRow
                        key={skill}
                        skill={skill}
                        first={idx === 0}
                        dividerColor={t.hover}
                        done={doneToday.has(skill)}
                        onToggle={() => toggle(skill)}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-3" style={{ color: t.muted }}>{recipe.howItHelps}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
