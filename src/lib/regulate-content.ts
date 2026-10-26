// Content for the Regulate tab, adapted from two therapy handouts:
// "The Window of Tolerance - Survival Map" and "Coping Skills Menu".
// Reference material only - nothing here reads from or writes to the database.
// Practice check-offs are stored in localStorage so no Supabase schema
// changes are needed.

export type ZoneId = 'hyper' | 'window' | 'hypo';

export interface NSZone {
  id: ZoneId;
  name: string;
  subtitle: string;
  feelLine: string;
  listTitle: string;
  listItems: string[];
  strategiesTitle: string;
  strategies: string[];
  outcome: string;
  matchingStates: string[];
  matchingRecipes: string[];
}

export const NS_ZONES: NSZone[] = [
  {
    id: 'hyper',
    name: 'Revved up',
    subtitle: 'Hyperarousal, too much activation',
    feelLine: 'Anxious, restless, running hot',
    listTitle: 'You might notice',
    listItems: [
      'Anxiety, panic, irritability, anger',
      'Restlessness, urgency, overthinking',
      'Tight chest, shallow breathing, muscle tension',
      'Impulsive reactions',
    ],
    strategiesTitle: 'Ways back',
    strategies: [
      'Slow exhale breathing: make the out-breath longer than the in-breath',
      'Temperature shift: cold water, cool air',
      'Grounding through pressure: weighted object, firm touch',
      'Name what is happening: "My body feels unsafe"',
      'Reduce stimulation: noise, screens, multitasking',
    ],
    outcome: 'Energy settles, clarity returns.',
    matchingStates: ['Alert', 'On Edge', 'Flooded'],
    matchingRecipes: ['quick-starters', 'emergency-reset'],
  },
  {
    id: 'window',
    name: 'In your window',
    subtitle: 'Regulated, your home base',
    feelLine: 'Grounded, present, able to choose',
    listTitle: 'How it feels',
    listItems: [
      'Emotional balance',
      'Clear thinking and focus',
      'Body feels grounded and responsive',
      'Capacity for connection and problem-solving',
    ],
    strategiesTitle: 'How to stay here',
    strategies: [
      'Predictable routines',
      'Adequate rest, hydration, nourishment',
      'Boundaries with stressors',
      'Regular regulation practice, not just during crisis',
    ],
    outcome: 'This is the state where glimmers are easiest to notice.',
    matchingStates: ['Grounded', 'Calm'],
    matchingRecipes: ['daily-maintenance', 'comfort-picks'],
  },
  {
    id: 'hypo',
    name: 'Shut down',
    subtitle: 'Hypoarousal, too little activation',
    feelLine: 'Numb, heavy, far away',
    listTitle: 'You might notice',
    listItems: [
      'Numbness, shutdown, dissociation',
      'Low energy, heaviness, foggy thinking',
      'Avoidance, withdrawal, freeze response',
      'Feeling disconnected from yourself or others',
    ],
    strategiesTitle: 'Ways back',
    strategies: [
      'Gentle movement: stretching, walking, shaking it out',
      'Sensory activation: warm drinks, textured objects',
      'Rhythmic actions: rocking, tapping, music',
      'Orient to the room: name 5 things you can see',
      'Self-talk: "I am here. I am safe."',
    ],
    outcome: 'Energy increases, presence returns.',
    matchingStates: ['Numb'],
    matchingRecipes: ['comfort-picks', 'main-tools'],
  },
];

export const CHECKIN_INTRO =
  'Outside your window, survival responses take over and clear thinking goes offline. That is physiology, not failure. The goal is safety first; problem-solving comes after.';

export const RECOVERY_RULE = {
  title: 'The recovery rule',
  body: 'Regulation comes before reasoning. You cannot think your way out of nervous-system overload.',
  emphasis: 'Small, consistent regulation is what widens the window over time.',
};

export interface Recipe {
  id: string;
  name: string;
  subtitle: string;
  skills: string[];
  howItHelps: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'quick-starters',
    name: 'Quick starters',
    subtitle: '5-minute calming tools',
    skills: [
      'Box breathing (in 4, hold 4, out 4)',
      'Name 5 things you can see',
      'Shoulder roll and stretch reset',
      'Sip water slowly, focus on the taste',
      'Change position: stand, walk, stretch',
    ],
    howItHelps:
      'Quick tools that ground your attention in the present and interrupt racing thoughts without needing much time or energy. Good for mildly scattered moments.',
  },
  {
    id: 'main-tools',
    name: 'Main regulation tools',
    subtitle: 'Deeper coping strategies',
    skills: [
      'Thought reframing ("What else could be true?")',
      '10-minute journal dump',
      'Guided meditation or body scan',
      'Progressive muscle relaxation',
      'Slow mindful walking',
    ],
    howItHelps:
      'These work deeper, regulating emotional responses and building awareness between thoughts, feelings, and actions. Use them when stress lasts longer or you want lasting balance instead of quick relief.',
  },
  {
    id: 'emergency-reset',
    name: 'Emergency reset',
    subtitle: 'For panic or overwhelm',
    skills: [
      'Cold water splash or hold ice',
      '5-4-3-2-1 sensory grounding',
      'Long-exhale breathing (out longer than in)',
      'Step away from the triggering environment',
      'Repeat a safe phrase: "I am safe right now."',
    ],
    howItHelps:
      'Built for intense moments. These bring your nervous system back toward safety fast by engaging your senses and slowing the physical stress reaction. Use when anxiety spikes or emotions feel uncontrollable.',
  },
  {
    id: 'comfort-picks',
    name: 'Comfort picks',
    subtitle: 'Gentle self-soothing',
    skills: [
      'Wrap up in a blanket or cozy texture',
      'Listen to calming music or white noise',
      'Light a candle or use a pleasant scent',
      'Watch a familiar comforting show',
      'Gentle self-touch: hand on heart',
    ],
    howItHelps:
      'Warmth and reassurance. These ease loneliness, sadness, or exhaustion by creating feelings of safety and care, with no pressure to fix anything right away.',
  },
  {
    id: 'daily-maintenance',
    name: 'Daily maintenance',
    subtitle: 'Preventive habits',
    skills: [
      'Regular sleep routine',
      'Morning sunlight',
      'Gratitude journaling',
      'Digital boundaries',
      'Consistent movement or stretching',
    ],
    howItHelps:
      'Preventive habits strengthen resilience over time, so stress is easier to manage before it becomes overwhelming. Small daily actions build long-term regulation capacity.',
  },
];

export interface EnergyPick {
  id: string;
  label: string;
  recipeIds: string[];
}

export const ENERGY_PICKS: EnergyPick[] = [
  { id: 'low', label: 'Low energy', recipeIds: ['comfort-picks', 'daily-maintenance'] },
  { id: 'medium', label: 'Medium energy', recipeIds: ['main-tools'] },
  { id: 'high', label: 'High emotional intensity', recipeIds: ['emergency-reset'] },
  { id: 'quick', label: 'Need quick relief', recipeIds: ['quick-starters'] },
];

export const PRACTICE_TOASTS = [
  "Logged. That's the work.",
  'Nice. Your nervous system noticed.',
  'One rep closer to a wider window.',
  'Done. Small and repeated is how this works.',
];

export const STRIP_EMPTY = 'Nothing logged yet today. One small skill counts.';
export const STRIP_STARTED = 'Small and repeated is how the window widens.';

// --- Practice log (localStorage) ---

const PRACTICE_KEY = 'glimmer.regulate.practice.v1';

export type PracticeLog = Record<string, string[]>;

export function loadPracticeLog(): PracticeLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PRACTICE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as PracticeLog) : {};
  } catch {
    return {};
  }
}

export function savePracticeLog(log: PracticeLog): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRACTICE_KEY, JSON.stringify(log));
  } catch {
    // Storage blocked or full: the log just won't persist for now.
  }
}

/** Local dates for the last `count` days, oldest last (index 0 = today). */
export function recentDates(count: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${dd}`);
  }
  return out;
}

/** Local ISO date (yyyy-mm-dd) for the user's timezone, matching `localDateISO` in utils. */
function localTodayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// --- Daily "One Small Thing" picker ---------------------------------------

// The pool is the union of Daily Maintenance + Quick Starters — the small,
// repeatable, low-friction practices the user already knows. One is picked
// per day (deterministic per date) so the user sees the same "today's task"
// no matter how many times they open the app that day.
const ONE_SMALL_THING_POOL: string[] = (() => {
  const dm = RECIPES.find((r) => r.id === 'daily-maintenance');
  const qs = RECIPES.find((r) => r.id === 'quick-starters');
  // Quick starters first, then daily maintenance, so the day's pick is
  // usually a short low-effort action rather than a habit like "sleep".
  return [...(qs ? qs.skills : []), ...(dm ? dm.skills : [])];
})();

export const ONE_SMALL_THING_INTRO =
  "One tiny practice, picked for today. No deciding. Just do it, then mark it done.";
export const ONE_SMALL_THING_DONE =
  "Done for today. See you tomorrow.";

/** Deterministic pick — same skill shows all day, changes at midnight local. */
export function pickDailyOneSmallThing(date: Date = new Date()): string {
  const ds = localTodayISO(date);
  // Simple FNV-like hash of the date string so the pick is stable per day
  // but each day lands on a different skill.
  let hash = 0x811c9dc5;
  for (let i = 0; i < ds.length; i++) {
    hash ^= ds.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ONE_SMALL_THING_POOL[hash % ONE_SMALL_THING_POOL.length];
}

// --- Zone check-in log (localStorage) -------------------------------------
// Every time the user taps a zone in Check-in, we quietly log it (date →
// list of { zone, ts }). This powers the gentle weekly summary that the
// therapist can look at with the user. Stored locally — no Supabase schema
// change required.

export interface ZoneCheckInEntry {
  zone: ZoneId;
  ts: number;
  /** Optional one-line "what was happening" note, set when the user
      taps a zone. This powers the richer weekly view that the user
      can review with their therapist — instead of just "5 check-ins",
      the therapist sees context like "Tuesday at work, Wednesday morning". */
  note?: string;
}
export type ZoneCheckInLog = Record<string, ZoneCheckInEntry[]>;

const ZONE_CHECKIN_KEY = 'glimmer.checkin.zones.v1';

export function loadZoneCheckIns(): ZoneCheckInLog {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(ZONE_CHECKIN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as ZoneCheckInLog) : {};
  } catch {
    return {};
  }
}

export function saveZoneCheckIns(log: ZoneCheckInLog): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ZONE_CHECKIN_KEY, JSON.stringify(log));
  } catch {
    // Storage blocked or full — log just won't persist for now.
  }
}

/** Append a zone check-in entry for today. Returns the updated log. */
export function logZoneCheckIn(zone: ZoneId, log?: ZoneCheckInLog): ZoneCheckInLog {
  const next = log ?? loadZoneCheckIns();
  const today = localTodayISO();
  const list = next[today] ? [...next[today]] : [];
  list.push({ zone, ts: Date.now() });
  next[today] = list;
  saveZoneCheckIns(next);
  return next;
}

/**
 * Attach a one-line "what was happening" note to the most recent zone
 * check-in for today (the entry created by the most recent tap).
 * Safe to call repeatedly as the user types — each call replaces the
 * previous note on the last entry, doesn't create new entries.
 */
export function updateLastZoneCheckInNote(note: string, log?: ZoneCheckInLog): ZoneCheckInLog {
  const next = log ?? loadZoneCheckIns();
  const today = localTodayISO();
  const list = next[today] ? [...next[today]] : [];
  if (list.length === 0) return next;
  const last = list[list.length - 1];
  // Save empty string as undefined so the entry stays clean if the user
  // clears the field. Otherwise trim and store.
  list[list.length - 1] = { ...last, note: note.trim() || undefined };
  next[today] = list;
  saveZoneCheckIns(next);
  return next;
}

export interface ZoneCheckInSummary {
  total: number;
  byZone: Record<ZoneId, number>;
  topZone: ZoneId | null;
  /** Day-by-day entries for the week, oldest first. Used by the Weekly tab
      to render a per-day list with optional notes (the richer therapist-
      reviewable view). */
  days: { date: string; entries: ZoneCheckInEntry[] }[];
}

/** Compute a soft weekly summary of zone check-ins over the last 7 days. */
export function getWeeklyCheckInSummary(log?: ZoneCheckInLog): ZoneCheckInSummary {
  const data = log ?? loadZoneCheckIns();
  // Last 7 days, oldest first (so the days array reads chronologically).
  const last7 = [...recentDates(7)].reverse();
  const byZone: Record<ZoneId, number> = { hyper: 0, window: 0, hypo: 0 };
  let total = 0;
  const days: { date: string; entries: ZoneCheckInEntry[] }[] = [];
  for (const date of last7) {
    const entries = data[date] ?? [];
    total += entries.length;
    for (const e of entries) {
      if (byZone[e.zone] !== undefined) byZone[e.zone]++;
    }
    days.push({ date, entries });
  }
  let topZone: ZoneId | null = null;
  let topCount = 0;
  (Object.keys(byZone) as ZoneId[]).forEach((z) => {
    if (byZone[z] > topCount) {
      topCount = byZone[z];
      topZone = z;
    }
  });
  // Only call it "mostly X" if there's actually a clear winner (>= 1 check-in)
  if (topCount === 0) topZone = null;
  return { total, byZone, topZone, days };
}

/**
 * Same as getWeeklyCheckInSummary, but for an arbitrary Monday-anchored
 * week (the same weekStart format used by the Weekly tab). This lets the
 * Weekly tab show the user's check-in pattern for *past* weeks, not just
 * the current one — useful when reviewing with a therapist.
 *
 * `weekStart` should be a `yyyy-mm-dd` Monday (matching the output of
 * `localWeekStart()` from utils.ts). Passing any other weekday silently
 * still works — we just walk 7 days forward from the given date.
 */
export function getWeeklyCheckInSummaryForWeek(
  weekStart: string,
  log?: ZoneCheckInLog
): ZoneCheckInSummary {
  const data = log ?? loadZoneCheckIns();
  // Parse the weekStart as local noon to avoid DST-midnight off-by-ones.
  const start = new Date(weekStart + 'T12:00:00');
  const byZone: Record<ZoneId, number> = { hyper: 0, window: 0, hypo: 0 };
  let total = 0;
  const days: { date: string; entries: ZoneCheckInEntry[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const ds = localTodayISO(d);
    const entries = data[ds] ?? [];
    total += entries.length;
    for (const e of entries) {
      if (byZone[e.zone] !== undefined) byZone[e.zone]++;
    }
    days.push({ date: ds, entries });
  }
  let topZone: ZoneId | null = null;
  let topCount = 0;
  (Object.keys(byZone) as ZoneId[]).forEach((z) => {
    if (byZone[z] > topCount) {
      topCount = byZone[z];
      topZone = z;
    }
  });
  if (topCount === 0) topZone = null;
  return { total, byZone, topZone, days };
}

// --- Practice milestones (localStorage flag bookkeeping) -----------------
// Tracks which practice milestones have already been celebrated, so each
// one only fires the friendly popup once. Keyed by milestone id (not date)
// because these are "first time ever" celebrations, not daily ones.

const PRACTICE_MILESTONE_KEY = 'glimmer.practice.milestones.v1';

export function loadShownPracticeMilestones(): Record<string, true> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PRACTICE_MILESTONE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, true>) : {};
  } catch {
    return {};
  }
}

export function markPracticeMilestoneShown(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const shown = loadShownPracticeMilestones();
    shown[key] = true;
    window.localStorage.setItem(PRACTICE_MILESTONE_KEY, JSON.stringify(shown));
  } catch {
    // best effort
  }
}

/**
 * Count the current practice streak — consecutive days (ending today or
 * yesterday) with at least one skill logged, with ONE grace day allowed
 * per active streak. Mirrors the entry-streak logic in supabase-service.ts
 * so "today is empty" doesn't break a streak the user is still in the
 * middle of, AND so missing a single day mid-streak doesn't erase the
 * work that came before it.
 *
 * Grace day rule: skip ONE empty day per active streak. Two empty days in
 * a row ends the streak.
 */
export function getPracticeStreakDays(log: PracticeLog): number {
  const today = new Date();
  const todayStr = localTodayISO(today);
  // If today has practice, count from today. Otherwise start from yesterday
  // (so a streak isn't lost the moment midnight passes — it lives until
  // the user misses a full day).
  const startOffset = (log[todayStr]?.length ?? 0) > 0 ? 0 : 1;
  let streak = 0;
  let graceUsed = false;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ds = localTodayISO(d);
    if (log[ds] && log[ds].length > 0) {
      streak++;
    } else if (!graceUsed) {
      // Use the grace day — skip this empty day, keep the streak alive.
      graceUsed = true;
    } else {
      // Two empty days in a row — streak is over.
      break;
    }
  }
  return streak;
}

/** Total count of skills logged across all days (for cumulative milestones). */
export function getTotalPracticeCount(log: PracticeLog): number {
  return Object.values(log).reduce((sum, list) => sum + (list?.length ?? 0), 0);
}
