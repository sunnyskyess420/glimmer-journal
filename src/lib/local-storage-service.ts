import type { GlimmerEntry, Stats } from '@/store/journal-store';
import { localDateISO } from '@/lib/utils';

const STORAGE_KEYS = {
  ENTRIES: 'glimmer_entries',
  REFLECTIONS: 'glimmer_reflections',
  THEME: 'glimmer_theme',
  THEME_MODE: 'glimmer_theme_mode',
};

// ---- Auth (No-op for localStorage) ----

export async function signUp(email: string, password: string, name?: string) {
  // No-op for localStorage
  return { user: { id: 'local-user', email, user_metadata: { name: name || null, theme: 'Sage' } } };
}

export async function signIn(email: string, password: string) {
  // No-op for localStorage
  return { user: { id: 'local-user', email, user_metadata: { theme: 'Sage' } } };
}

export async function signInAsGuest() {
  // No-op for localStorage
  return { user: { id: 'local-guest', email: null, user_metadata: { theme: 'Sage' } } };
}

export async function signOut() {
  // No-op for localStorage
}

export async function getUserTheme(): Promise<string> {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'Sage';
}

export async function updateUserTheme(theme: string, themeMode?: string) {
  if (theme) localStorage.setItem(STORAGE_KEYS.THEME, theme);
  if (themeMode === 'light' || themeMode === 'dark') {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, themeMode);
  }
}

// ---- Entries ----

export async function fetchEntries(): Promise<{ entries: GlimmerEntry[]; total: number }> {
  const raw = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  if (!raw) return { entries: [], total: 0 };

  try {
    const entries: GlimmerEntry[] = JSON.parse(raw);
    return { entries, total: entries.length };
  } catch {
    return { entries: [], total: 0 };
  }
}

export async function createEntry(payload: {
  date: string; promptIndex: number; promptLabel: string;
  response: string; preState: string; postState: string;
  intensity: number; duration: string; bodyLocation: string;
  tags: string[]; note?: string; sleepQuality: number; stressLevel: number; starred: boolean;
}): Promise<GlimmerEntry> {
  const { data } = await fetchEntries();
  const newEntry: GlimmerEntry = {
    id: crypto.randomUUID(),
    date: payload.date,
    promptIndex: payload.promptIndex,
    promptLabel: payload.promptLabel,
    response: payload.response,
    preState: payload.preState,
    postState: payload.postState,
    intensity: payload.intensity,
    duration: payload.duration,
    bodyLocation: payload.bodyLocation,
    tags: JSON.stringify(payload.tags),
    note: payload.note || '',
    sleepQuality: payload.sleepQuality,
    stressLevel: payload.stressLevel,
    starred: payload.starred,
    createdAt: new Date().toISOString(),
  };

  const updatedEntries = [newEntry, ...data];
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updatedEntries));
  return newEntry;
}

export async function updateEntry(id: string, updates: Record<string, unknown>) {
  const { data } = await fetchEntries();
  const updated = data.map((e) => {
    if (e.id === id) {
      const entry = { ...e };
      if (updates.response !== undefined) entry.response = updates.response as string;
      if (updates.preState !== undefined) entry.preState = updates.preState as string;
      if (updates.postState !== undefined) entry.postState = updates.postState as string;
      if (updates.intensity !== undefined) entry.intensity = updates.intensity as number;
      if (updates.duration !== undefined) entry.duration = updates.duration as string;
      if (updates.bodyLocation !== undefined) entry.bodyLocation = updates.bodyLocation as string;
      if (updates.sleepQuality !== undefined) entry.sleepQuality = updates.sleepQuality as number;
      if (updates.stressLevel !== undefined) entry.stressLevel = updates.stressLevel as number;
      if (updates.starred !== undefined) entry.starred = updates.starred as boolean;
      if (updates.tags !== undefined) entry.tags = typeof updates.tags === 'string' ? updates.tags : JSON.stringify(updates.tags);
      if (updates.note !== undefined) entry.note = updates.note as string;
      return entry;
    }
    return e;
  });
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(updated));
}

export async function deleteEntry(id: string) {
  const { data } = await fetchEntries();
  const filtered = data.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(filtered));
}

// ---- Reflections ----

export async function fetchReflection(weekStart: string) {
  const raw = localStorage.getItem(STORAGE_KEYS.REFLECTIONS);
  if (!raw) return null;

  try {
    const reflections: Record<string, string[]> = JSON.parse(raw);
    const responses = reflections[weekStart];
    return responses ? { responses } : null;
  } catch {
    return null;
  }
}

export interface WeeklyReflectionRecord {
  weekStart: string;
  responses: string[];
}

export async function fetchAllReflections(): Promise<WeeklyReflectionRecord[]> {
  const raw = localStorage.getItem(STORAGE_KEYS.REFLECTIONS);
  if (!raw) return [];

  try {
    const reflections: Record<string, string[]> = JSON.parse(raw);
    return Object.entries(reflections).map(([weekStart, responses]) => ({
      weekStart,
      responses,
    }));
  } catch {
    return [];
  }
}

export async function saveReflection(weekStart: string, responses: string[]) {
  const raw = localStorage.getItem(STORAGE_KEYS.REFLECTIONS);
  const reflections: Record<string, string[]> = raw ? JSON.parse(raw) : {};
  reflections[weekStart] = responses;
  localStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(reflections));
}

// ---- Stats ----

export async function fetchStats(): Promise<Stats> {
  const { data: entries } = await fetchEntries();
  const total = entries.length;
  const starred = entries.filter((e) => e.starred).length;

  const stateCounts: Record<string, number> = {};
  entries.forEach((e) => {
    const s = e.postState;
    if (s) stateCounts[s] = (stateCounts[s] || 0) + 1;
  });

  const shifts: Record<string, number> = {};
  entries.forEach((e) => {
    const pre = e.preState;
    const post = e.postState;
    if (pre && post && pre !== post) {
      const key = `${pre} > ${post}`;
      shifts[key] = (shifts[key] || 0) + 1;
    }
  });

  const withIntensity = entries.filter((e) => e.intensity > 0);
  const avgIntensity = withIntensity.length > 0
    ? withIntensity.reduce((s, e) => s + e.intensity, 0) / withIntensity.length
    : 0;

  const tagCounts: Record<string, number> = {};
  entries.forEach((e) => {
    try {
      const tags = JSON.parse(e.tags);
      if (Array.isArray(tags)) {
        tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      }
    } catch {
      // Ignore parse errors
    }
  });

  const today = new Date();
  const last7: { date: string; avgIntensity: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = localDateISO(d);
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const dayWithIntensity = dayEntries.filter((e) => e.intensity > 0);
    last7.push({
      date: dateStr,
      avgIntensity: dayWithIntensity.length > 0
        ? dayWithIntensity.reduce((s, e) => s + e.intensity, 0) / dayWithIntensity.length
        : 0,
      count: dayEntries.length,
    });
  }

  // Streak with one grace day
  const entryDates = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let streak = 0;
  let graceUsed = false;
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const ds = localDateISO(checkDate);
    if (entryDates.includes(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
      const yds = localDateISO(checkDate);
      if (entryDates.includes(yds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      if (!graceUsed) {
        graceUsed = true;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    } else {
      if (!graceUsed) {
        graceUsed = true;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return { total, starred, stateCounts, shifts, avgIntensity, tagCounts, last7, streak, uniqueDates: entryDates };
}
