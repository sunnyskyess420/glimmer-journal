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

export async function updateUserTheme(theme: string) {
  await supabase.auth.updateUser({ data: { theme } });
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

  const entries: GlimmerEntry[] = (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
    promptIndex: row.prompt_index as number,
    promptLabel: row.prompt_label as string,
    response: row.response as string,
    preState: row.pre_state as string,
    postState: row.post_state as string,
    intensity: row.intensity as number,
    duration: row.duration as string,
    bodyLocation: row.body_location as string,
    tags: row.tags as string,
    sleepQuality: row.sleep_quality as number,
    stressLevel: row.stress_level as number,
    starred: row.starred as boolean,
    createdAt: row.created_at as string,
  }));

  return { entries, total: entries.length };
}

export async function createEntry(payload: {
  date: string; promptIndex: number; promptLabel: string;
  response: string; preState: string; postState: string;
  intensity: number; duration: string; bodyLocation: string;
  tags: string[]; sleepQuality: number; stressLevel: number; starred: boolean;
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
      tags: JSON.stringify(payload.tags),
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
  if (updates.tags !== undefined) dbUpdates.tags = typeof updates.tags === 'string' ? updates.tags : JSON.stringify(updates.tags);
  if (updates.sleepQuality !== undefined) dbUpdates.sleep_quality = updates.sleepQuality;
  if (updates.stressLevel !== undefined) dbUpdates.stress_level = updates.stressLevel;
  if (updates.starred !== undefined) dbUpdates.starred = updates.starred;

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
    try {
      const tags: string[] = JSON.parse(e.tags as string);
      tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    } catch { /* ignore */ }
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

  const entryDates = [...new Set(entries.map((e: Record<string, unknown>) => e.date as string))].sort().reverse();
  let streak = 0;
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
      break;
    } else {
      break;
    }
  }

  return { total, starred, stateCounts, shifts, avgIntensity, tagCounts, last7, streak, uniqueDates: entryDates };
}

// ---- Helpers ----

function mapEntry(row: Record<string, unknown>): GlimmerEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    promptIndex: row.prompt_index as number,
    promptLabel: row.prompt_label as string,
    response: row.response as string,
    preState: row.pre_state as string,
    postState: row.post_state as string,
    intensity: row.intensity as number,
    duration: row.duration as string,
    bodyLocation: row.body_location as string,
    tags: row.tags as string,
    sleepQuality: row.sleep_quality as number,
    stressLevel: row.stress_level as number,
    starred: row.starred as boolean,
    createdAt: row.created_at as string,
  };
}
