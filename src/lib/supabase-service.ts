import { supabase } from './supabase';
import type { GlimmerEntry, Stats } from '@/store/journal-store';
import { localDateISO } from '@/lib/utils';

// ---- Auth ----

export async function signUp(email: string, password: string, name?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name || null, theme: 'Mono' } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserTheme(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return (user?.user_metadata?.theme as string) || 'Mono';
}

/**
 * Persist the user's theme family (e.g. 'Mono', 'Sage') AND their light/dark
 * mode preference to Supabase user_metadata. Both are stored together so a
 * single call updates both; either can be omitted to leave it unchanged.
 */
export async function updateUserTheme(theme: string, themeMode?: string) {
  const data: Record<string, unknown> = { theme };
  if (themeMode === 'light' || themeMode === 'dark') {
    data.themeMode = themeMode;
  }
  await supabase.auth.updateUser({ data });
}

// ---- Entries ----

export async function fetchEntries(): Promise<{ entries: GlimmerEntry[]; total: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { entries: [], total: 0 };

  const { data, error } = await supabase
    .from('glimmer_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // mapEntry handles extracting the note from the tags column for us.
  const entries: GlimmerEntry[] = (data || []).map((row: Record<string, unknown>) => mapEntry(row));

  return { entries, total: entries.length };
}

export async function createEntry(payload: {
  date: string; promptIndex: number; promptLabel: string;
  response: string; preState: string; postState: string;
  intensity: number; duration: string; bodyLocation: string;
  tags: string[]; note?: string; sleepQuality: number; stressLevel: number; starred: boolean;
}): Promise<GlimmerEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('glimmer_entries')
    .insert({
      user_id: user.id,
      date: payload.date,
      prompt_index: payload.promptIndex,
      prompt_label: payload.promptLabel,
      response: payload.response,
      pre_state: payload.preState,
      post_state: payload.postState,
      intensity: payload.intensity,
      duration: payload.duration,
      body_location: payload.bodyLocation,
      tags: serializeTagsRow(payload.tags, payload.note || ''),
      sleep_quality: payload.sleepQuality,
      stress_level: payload.stressLevel,
      starred: payload.starred,
    })
    .select()
    .single();

  if (error) throw error;
  return mapEntry(data);
}

export async function updateEntry(id: string, updates: Record<string, unknown>) {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.response !== undefined) dbUpdates.response = updates.response;
  if (updates.preState !== undefined) dbUpdates.pre_state = updates.preState;
  if (updates.postState !== undefined) dbUpdates.post_state = updates.postState;
  if (updates.intensity !== undefined) dbUpdates.intensity = updates.intensity;
  if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
  if (updates.bodyLocation !== undefined) dbUpdates.body_location = updates.bodyLocation;
  if (updates.sleepQuality !== undefined) dbUpdates.sleep_quality = updates.sleepQuality;
  if (updates.stressLevel !== undefined) dbUpdates.stress_level = updates.stressLevel;
  if (updates.starred !== undefined) dbUpdates.starred = updates.starred;

  // Tags and note both end up in the same `tags` column (note is smuggled
  // inside as a `_note` key). If either is being updated, we need to merge
  // them together — the caller may pass `tags`, `note`, or both.
  if (updates.tags !== undefined || updates.note !== undefined) {
    // Parse the incoming tags — could be an array or a JSON-stringified array.
    let tagsArr: string[] = [];
    if (updates.tags !== undefined) {
      if (typeof updates.tags === 'string') {
        try { tagsArr = JSON.parse(updates.tags) as string[]; } catch { tagsArr = []; }
      } else if (Array.isArray(updates.tags)) {
        tagsArr = updates.tags as string[];
      }
    }
    const noteStr = typeof updates.note === 'string' ? updates.note : '';
    dbUpdates.tags = serializeTagsRow(tagsArr, noteStr);
  }

  const { error } = await supabase
    .from('glimmer_entries')
    .update(dbUpdates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteEntry(id: string) {
  const { error } = await supabase
    .from('glimmer_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ---- Reflections ----

export async function fetchReflection(weekStart: string) {
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) throw error;
  return data ? { responses: JSON.parse(data.responses as string) as string[] } : null;
}

export interface WeeklyReflectionRecord {
  weekStart: string;
  responses: string[];
}

export async function fetchAllReflections(): Promise<WeeklyReflectionRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('week_start, responses')
    .eq('user_id', user.id)
    .order('week_start', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: { week_start: string; responses: string }) => ({
    weekStart: row.week_start,
    responses: (() => {
      try {
        return JSON.parse(row.responses) as string[];
      } catch {
        return [];
      }
    })(),
  }));
}

export async function saveReflection(weekStart: string, responses: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Upsert
  const { error } = await supabase
    .from('weekly_reflections')
    .upsert({
      user_id: user.id,
      week_start: weekStart,
      responses: JSON.stringify(responses),
    }, { onConflict: 'user_id,week_start' });

  if (error) throw error;
}

// ---- Stats ----

export async function fetchStats(): Promise<Stats> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { total: 0, starred: 0, stateCounts: {}, shifts: {}, avgIntensity: 0, tagCounts: {}, last7: [], streak: 0, uniqueDates: [] };
  }

  const { data, error } = await supabase
    .from('glimmer_entries')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;

  const entries = data || [];
  const total = entries.length;
  const starred = entries.filter((e: Record<string, unknown>) => e.starred).length;

  const stateCounts: Record<string, number> = {};
  entries.forEach((e: Record<string, unknown>) => {
    const s = e.post_state as string;
    if (s) stateCounts[s] = (stateCounts[s] || 0) + 1;
  });

  const shifts: Record<string, number> = {};
  entries.forEach((e: Record<string, unknown>) => {
    const pre = e.pre_state as string;
    const post = e.post_state as string;
    if (pre && post && pre !== post) {
      const key = `${pre} > ${post}`;
      shifts[key] = (shifts[key] || 0) + 1;
    }
  });

  const withIntensity = entries.filter((e: Record<string, unknown>) => (e.intensity as number) > 0);
  const avgIntensity = withIntensity.length > 0
    ? withIntensity.reduce((s: number, e: Record<string, unknown>) => s + (e.intensity as number), 0) / withIntensity.length
    : 0;

  const tagCounts: Record<string, number> = {};
  entries.forEach((e: Record<string, unknown>) => {
    // parseTagsRow handles both the old array format and the new object
    // format (which also carries the _note). We only count actual tags,
    // never the _note field.
    const { tags } = parseTagsRow(e.tags as string);
    tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });

  const today = new Date();
  const last7: { date: string; avgIntensity: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = localDateISO(d);
    const dayEntries = entries.filter((e: Record<string, unknown>) => e.date === dateStr);
    const dayWithIntensity = dayEntries.filter((e: Record<string, unknown>) => (e.intensity as number) > 0);
    last7.push({
      date: dateStr,
      avgIntensity: dayWithIntensity.length > 0
        ? dayWithIntensity.reduce((s: number, e: Record<string, unknown>) => s + (e.intensity as number), 0) / dayWithIntensity.length
        : 0,
      count: dayEntries.length,
    });
  }

  // Streak with one grace day.
  // A streak is consecutive days (today-or-yesterday backwards) with at
  // least one entry. Missing a single day doesn't break the streak — we
  // allow exactly one "grace day" per active streak. So if you journaled
  // Mon-Fri, skipped Sat, and journaled Sun, that's a 6-day streak (not a
  // broken 5-day streak restarting at 1). The grace day is reset once the
  // streak ends — i.e., once you miss TWO consecutive days, the streak is
  // done and any new streak starts fresh.
  //
  // This matches how mental-health practice actually works: missing a day
  // because life happened shouldn't erase the work that came before it.
  const entryDates = [...new Set(entries.map((e: Record<string, unknown>) => e.date as string))].sort().reverse();
  let streak = 0;
  let graceUsed = false;
  const checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const ds = localDateISO(checkDate);
    if (entryDates.includes(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today is empty — that's fine, "today is in progress". Check
      // yesterday without consuming a grace day.
      checkDate.setDate(checkDate.getDate() - 1);
      const yds = localDateISO(checkDate);
      if (entryDates.includes(yds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      // Yesterday is also empty. Try the day before as the grace day — if
      // the streak is still alive, it can survive one missed day.
      if (!graceUsed) {
        graceUsed = true;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    } else {
      // We hit a missing day mid-streak. Use the grace day if we haven't
      // already, otherwise the streak is over.
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

// ---- Helpers ----

// The note field is smuggled inside the existing `tags` JSON column as a
// special `_note` key so we don't need a Supabase schema migration. The
// user sees a separate "What was happening?" input in the UI; on save we
// pack it into the tags object; on load we extract it back out. The tag
// chips UI never sees the _note because we filter it out before display.
//
// Shape stored in the `tags` column:
//   { tags: ["Morning", "Alone"], _note: "at work, stressful morning" }
// (Old rows that store an array of strings still work — see parseTagsRow.)

const NOTE_KEY = '_note';

function parseTagsRow(raw: string | null | undefined): { tags: string[]; note: string } {
  if (!raw) return { tags: [], note: '' };
  try {
    const parsed = JSON.parse(raw);
    // Old format: array of strings, e.g. ["Morning", "Alone"]
    if (Array.isArray(parsed)) return { tags: parsed, note: '' };
    // New format: object with `tags` array and optional `_note` string
    if (parsed && typeof parsed === 'object') {
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      const note = typeof parsed[NOTE_KEY] === 'string' ? parsed[NOTE_KEY] : '';
      return { tags, note };
    }
    return { tags: [], note: '' };
  } catch {
    return { tags: [], note: '' };
  }
}

function serializeTagsRow(tags: string[], note: string): string {
  if (!note) {
    // No note — store as a plain array for backward compatibility with
    // any code that expects the old format.
    return JSON.stringify(tags);
  }
  return JSON.stringify({ tags, [NOTE_KEY]: note });
}

function mapEntry(row: Record<string, unknown>): GlimmerEntry {
  const { tags, note } = parseTagsRow(row.tags as string);
  return {
    id: row.id as string,
    date: row.date as string,
    promptIndex: row.prompt_index as number,
    promptLabel: row.prompt_label as string,
    response: row.response as string,
    note,
    preState: row.pre_state as string,
    postState: row.post_state as string,
    intensity: row.intensity as number,
    duration: row.duration as string,
    bodyLocation: row.body_location as string,
    tags: JSON.stringify(tags), // keep `tags` as a JSON-stringified array on the client side
    sleepQuality: row.sleep_quality as number,
    stressLevel: row.stress_level as number,
    starred: row.starred as boolean,
    createdAt: row.created_at as string,
  };
}
