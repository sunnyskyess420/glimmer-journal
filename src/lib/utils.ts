import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the LOCAL date as `yyyy-mm-dd` (not UTC).
 *
 * `new Date().toISOString().split('T')[0]` returns the UTC date, which means
 * at 6pm Mountain Time the app already shows "tomorrow". This helper returns
 * the date in whatever timezone the browser is in, so "today" matches what
 * the user actually sees on their wall clock.
 *
 * Optionally pass a Date to format that specific date in local time.
 */
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the local Monday of the week containing the given date.
 * Week starts on Monday (so Sunday midnight is the boundary).
 */
export function localWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Shift to Monday: if Sunday (0), go back 6 days; otherwise go back (day - 1) days
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateISO(d);
}
