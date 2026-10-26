# Glimmer Journal

A personal journaling app rooted in polyvagal theory. Track micro-moments of
safety ("glimmers") and build a nervous-system-aware record you can review
with your therapist. Live at [glimmer-journal.vercel.app](https://glimmer-journal.vercel.app/).

## What it does

The app is built around a single question — *where are you right now?*
When you open it, you land on **Check-in** (not on journaling), and the
first thing you see is your **One Small Thing** for the day: a single,
deterministic practice picked from your Quick Starters and Daily
Maintenance skills. No deciding, no scrolling — just do it, then tap
**Mark done**.

From there you can:

- **Check in with your nervous system** by tapping one of three zones —
  *Revved up* (hyperarousal), *In your window* (regulated), or *Shut down*
  (hypoarousal). Each tap is quietly logged with an optional
  "what was happening" note so you can review the shape of your week with
  your therapist.
- **Breathe** with an animated guided breathing circle. Six patterns:
  Box, **Calm hold** (In 4 · Hold 4 · Out 6), Long exhale, 4-7-8, Coherent,
  and Physiological sigh. Your last-used pattern sticks across sessions.
- **Use the Toolbox** of coping skills organized by recipe (Quick starters,
  Main regulation tools, Emergency reset, Comfort picks, Daily
  maintenance). Mark any skill done with one tap.
- **Write a Daily Entry** against the 7 polyvagal-theory prompts (safe,
  comforting, beautiful, easier, body relaxed, hope, remember tomorrow)
  with metadata: pre/post nervous-system state, intensity, body location,
  context tags, sleep/stress levels, duration.
- **Star entries** into your Glimmer Bank — a go-to list of things that
  reliably help you feel safe.
- **Reflect weekly** with three prompts, and see a gentle weekly check-in
  summary ("You checked in N times this week — mostly in your window")
  alongside your written reflection.
- **Share a focused week** with your therapist as a PDF — cover + check-in
  summary with notes + daily entries + weekly reflection.
- **Export the full journal** to a therapist-friendly PDF with stats,
  state distribution, top tags, and weekly reflections.

## Daily reminder (opt-in)

A toggle in the sidebar lets you opt in to a daily reminder about your
One Small Thing, with a configurable time (default 9 PM local). Honest
about platform limits: fires when the app is open, or in the background
when installed as a PWA on Chrome/Edge (via the Periodic Background Sync
API). iOS/Safari can only fire while the app is open. True cross-device
server-driven push would need VAPID + a server cron job — that's a
future project.

## Streaks

Both journal-entry streaks and practice-log streaks honor a **one grace
day** rule: missing a single day doesn't break the streak. Two empty days
in a row ends it. Missing a day because life happened shouldn't erase
the work that came before it.

## Tech stack

- **Next.js 16** + **React 19** + **TypeScript** + **Tailwind 4**
- **Supabase** for auth + entries + weekly reflections
- **Zustand** for client state
- **jsPDF** for PDF export
- LocalStorage for the practice log, zone check-in log, breathing
  pattern preference, reminder settings, and shown-milestone flags
  (no Supabase schema changes needed for any of those)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. You'll need a Supabase project with the
`glimmer_entries` and `weekly_reflections` tables. Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(There are hardcoded fallbacks in `src/lib/supabase.ts` for development.)

## Acknowledgements

Adapted from therapy handouts on the Window of Tolerance (Deb Dana) and
coping-skills menus. Built for personal use; not a substitute for
professional care. If you're in crisis, call or text 988 (US & Canada)
or text HOME to 741741.
