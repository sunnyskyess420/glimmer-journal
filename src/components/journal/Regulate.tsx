'use client';

import { useEffect, useMemo, useState } from 'react';
import { THEMES, type ThemeColors } from '@/lib/constants';
import {
  NS_ZONES,
  RECIPES,
  ENERGY_PICKS,
  CHECKIN_INTRO,
  RECOVERY_RULE,
  PRACTICE_TOASTS,
  STRIP_EMPTY,
  STRIP_STARTED,
  loadPracticeLog,
  savePracticeLog,
  recentDates,
  type ZoneId,
} from '@/lib/regulate-content';
import { useJournalStore } from '@/store/journal-store';

// Shared practice log. Both pages (Check-in and Toolbox) read and write the
// same localStorage log, so a skill marked done on one page shows up in the
// other page's counts the next time you open it.
function usePracticeLog() {
  const { showToast } = useJournalStore();
  const [log, setLog] = useState<Record<string, string[]>>({});
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
    if (list.includes(skill)) {
      updated[today] = list.filter((s) => s !== skill);
    } else {
      list.push(skill);
      updated[today] = list;
      const msg = PRACTICE_TOASTS[Math.floor(Math.random() * PRACTICE_TOASTS.length)];
      showToast(msg);
    }
    setLog(updated);
    savePracticeLog(updated);
  };

  return { doneToday, todayCount, weekCount, toggle };
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
  const t: ThemeColors = THEMES[useJournalStore((s) => s.theme)];
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
  const t: ThemeColors = THEMES[useJournalStore((s) => s.theme)];
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
  const { theme } = useJournalStore();
  const setActiveTab = useJournalStore((s) => s.setActiveTab);
  const t: ThemeColors = THEMES[theme];
  const { doneToday, todayCount, weekCount, toggle } = usePracticeLog();

  const [zone, setZone] = useState<ZoneId | null>(null);

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

  return (
    <div className="flex flex-col gap-6">
      {/* Practice strip */}
      <section
        className="rounded-xl p-4"
        style={{ backgroundColor: t.cardBg, border: `1px solid ${t.lightLine}` }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold" style={{ color: t.text }}>Doing the work</h2>
          <span className="text-xs" style={{ color: t.muted }}>
            {todayCount} today · {weekCount} this week
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: t.muted }}>
          {todayCount === 0 ? STRIP_EMPTY : STRIP_STARTED}
        </p>
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
                  onClick={() => setZone(selected ? null : z.id)}
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
  const { theme } = useJournalStore();
  const t: ThemeColors = THEMES[theme];
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
