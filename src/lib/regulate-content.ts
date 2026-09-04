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
