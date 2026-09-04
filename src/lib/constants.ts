// Glimmer Journal constants - mirrors the tkinter app

export const PROMPTS = [
  "Today I noticed one small thing that felt safe:",
  "Today I noticed one small thing that felt comforting:",
  "Today I noticed one small thing that felt beautiful:",
  "Today I noticed one small thing that felt easier:",
  "Today I noticed one small thing that helped my body relax:",
  "Today I noticed one small thing that gave me hope:",
  "One thing I want to remember tomorrow:",
];

export const SHORT_LABELS = [
  "Safe", "Comforting", "Beautiful", "Easier",
  "Body relaxed", "Hope", "Remember tomorrow",
];

export const NS_STATES = ["Grounded", "Calm", "Alert", "On Edge", "Numb", "Flooded"];

export const INTENSITY_LABELS = ["Faint", "Subtle", "Warm", "Strong", "Full body"];
export const SLEEP_LABELS = ["Terrible", "Poor", "Fair", "Good", "Great"];
export const STRESS_LABELS = ["Zen", "Low", "Mid", "High", "Max"];

export const DURATION_OPTIONS = ["Seconds", "1-2 min", "10+ min", "Stayed with me"];

export const BODY_LOCATIONS = [
  "Chest", "Belly", "Face", "Throat",
  "Hands", "Back", "Whole body", "Couldn’t locate",
];

export const TAG_GROUPS: Record<string, string[]> = {
  Time: ["Morning", "Afternoon", "Evening", "Night"],
  Social: ["Alone", "Partner", "Friend", "Group", "Work", "Online"],
  Sensory: ["Saw", "Heard", "Felt (touch)", "Smelled/tasted", "Thought"],
  Place: ["Indoors", "Outdoors", "In nature", "Building", "Commute"],
};

export const WEEKLY_PROMPTS = [
  "This week I noticed my body felt safest when…",
  "I felt most disconnected or activated on…",
  "One thing I want to do more of next week to feel safe…",
];

export const SECTION_HELPERS: Record<number, string> = {
  1: "Notice where you are right now -- before the glimmer. There are no wrong answers.",
  2: "How big or small was this moment? Even a flicker counts.",
  3: "Your body often knows before your mind does. Where did the feeling show up?",
  4: "Context matters. What time, place, or company helped this glimmer appear?",
  5: "Sleep and stress shape how receptive you are to glimmers. Check in honestly.",
};

export const FOOTER_MESSAGES = [
  "Tiny examples: warm light, a good song, fresh air, a kind message, a quiet moment, a 5-minute walk.",
  "Every glimmer you notice strengthens your brain’s ability to detect safety.",
  "You don’t need to feel calm to find a glimmer -- they exist in every state.",
  "Glimmers accumulate. Even one a day rewires your nervous system over time.",
  "Polyvagal theory: small cues of safety can shift your entire state.",
  "What cues safety for you is unique. This journal helps you discover your personal map.",
  "If today felt hard, that’s okay. Just being here is a step.",
  "Your glimmer bank grows into a go-to list of things that reliably help you feel safe.",
  "The ventral vagal state is your birthright. Glimmers are the doorway back.",
  "Consistency matters more than perfection. A few words is enough.",
];

export const TOAST_MESSAGES = [
  "Glimmers saved. You’re building something meaningful.",
  "Saved! Every entry teaches your nervous system what safety feels like.",
  "Recorded. Your future self will thank you.",
  "Stored safely. One more data point in your healing map.",
  "Done! Your glimmers matter -- even the small ones.",
];

export const MILESTONES: Record<number, string> = {
  1: "Your first glimmer! The journey begins.",
  7: "7 entries -- a full week of tracking. Well done.",
  14: "14 entries -- two weeks of building awareness.",
  30: "30 entries -- a full month of glimmer tracking!",
  50: "50 entries -- half a century of micro-moments of safety.",
  100: "100 glimmers! You are a safety-detecting powerhouse.",
};

// Practice milestones — celebrate the *doing*, not just the journaling.
// Keys are stable ids used in localStorage to ensure each one only fires
// the friendly popup once (the first time the user hits that threshold).
export const PRACTICE_MILESTONES: Record<string, string> = {
  firstPractice:
    "Your first rep. This is how the window widens — one small, real practice at a time.",
  firstThreeInDay:
    "Three tools in one day. That's the work — small, repeated, real.",
  fiveDayStreak:
    "Five days in a row of practice. Your window is widening.",
  tenDayStreak:
    "Ten days of practice. You're building something your nervous system can lean on.",
  twentyFiveSkills:
    "25 skills logged. The reps are adding up.",
};

export const FIRST_TIME_MESSAGES = [
  "Welcome to Glimmer Journal. Start by noticing one small thing that felt safe today.",
  "This is your first time here. There’s no right way to do this -- just notice.",
  "Beginning your glimmer practice. Each small moment of safety you record matters.",
];

export const RETURN_MESSAGES = [
  "Welcome back. What’s one safe moment you’ve noticed today?",
  "Good to see you again. Your nervous system will thank you for checking in.",
  "You’re building a powerful habit. Let’s keep going.",
];

export const STREAK_MESSAGES = [
  "{n}-day streak! Your nervous system is learning that safety is reliable.",
  "{n} days in a row! Consistency is reshaping your window of tolerance.",
  "{n}-day streak! That’s real dedication to your wellbeing.",
];

// Theme system — each theme family has both a light and dark variant.
//
// The light variants are the original 5 themes unchanged. The dark variants
// are designed to look good in dark mode (not just be inverted light themes),
// so each has carefully-tuned muted/accent colors. The dark Dusk variant
// is the existing dark theme; the light Dusk variant is a new pale-lavender
// counterpart (so every theme supports both modes).
//
// The Zustand store holds `theme` (one of the 5 names) + `themeMode`
// ('light' | 'dark'). Components read `THEMES[theme][mode]` to get the
// resolved color set. The Sidebar's theme picker shows the 5 family dots
// plus a separate sun/moon toggle for the mode.

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  panelBg: string;
  cardBg: string;
  text: string;
  muted: string;
  border: string;
  lightLine: string;
  hover: string;
  select: string;
  btnBg: string;
  btnFg: string;
  btnHover: string;
  footer: string;
  star: string;
  starActive: string;
  tagBg: string;
  tagFg: string;
  toastBg: string;
  toastFg: string;
}

type ThemeFamily = {
  light: ThemeColors;
  dark: ThemeColors;
};

export const THEMES: Record<string, ThemeFamily> = {
  // ----- Mono -----
  // Clean black-on-white. Dark variant is true black with off-white text —
  // OLED-friendly, easier on the eyes at night.
  Mono: {
    light: {
      bg: "#FFFFFF", panelBg: "#F8F8F8", cardBg: "#FFFFFF",
      text: "#111111", muted: "#666666", border: "#111111",
      lightLine: "#CCCCCC", hover: "#F0F0F0", select: "#E8E8E8",
      btnBg: "#111111", btnFg: "#FFFFFF", btnHover: "#333333",
      footer: "#888888", star: "#999999", starActive: "#111111",
      tagBg: "#F0F0F0", tagFg: "#111111",
      toastBg: "#111111", toastFg: "#FFFFFF",
    },
    dark: {
      bg: "#0E0E10", panelBg: "#161618", cardBg: "#1C1C1F",
      text: "#F2F2F2", muted: "#9A9A9A", border: "#E0E0E0",
      lightLine: "#2C2C30", hover: "#222226", select: "#2A2A30",
      btnBg: "#F2F2F2", btnFg: "#0E0E10", btnHover: "#D4D4D4",
      footer: "#7A7A7A", star: "#5A5A5A", starActive: "#F2F2F2",
      tagBg: "#2C2C30", tagFg: "#F2F2F2",
      toastBg: "#F2F2F2", toastFg: "#0E0E10",
    },
  },

  // ----- Sage -----
  // Soft sage green on cream. Dark variant keeps the calming green identity
  // but with muted greens on a deep forest-night background.
  Sage: {
    light: {
      bg: "#F0F4EC", panelBg: "#E4EAE0", cardBg: "#FAFCF8",
      text: "#2A3528", muted: "#6B7D68", border: "#6B9E5C",
      lightLine: "#C8D8C0", hover: "#DEE8D4", select: "#D0DEC4",
      btnBg: "#5A8A4A", btnFg: "#FFFFFF", btnHover: "#4A7A3A",
      footer: "#8BA888", star: "#8BA888", starActive: "#5A8A4A",
      tagBg: "#E0EADA", tagFg: "#2A3528",
      toastBg: "#5A8A4A", toastFg: "#FFFFFF",
    },
    dark: {
      bg: "#141A12", panelBg: "#1C2418", cardBg: "#20281C",
      text: "#DCE8D2", muted: "#8AA080", border: "#9CB888",
      lightLine: "#2A3526", hover: "#242D1E", select: "#2E3826",
      btnBg: "#7AA860", btnFg: "#0E1408", btnHover: "#90C074",
      footer: "#6A8A60", star: "#5A7A50", starActive: "#9CB888",
      tagBg: "#2A3526", tagFg: "#DCE8D2",
      toastBg: "#7AA860", toastFg: "#0E1408",
    },
  },

  // ----- Ocean -----
  // Calm blue on cool white. Dark variant is deep navy with the same blue
  // accent — feels like a still night sea.
  Ocean: {
    light: {
      bg: "#EDF3F9", panelBg: "#E0EAF4", cardBg: "#F8FAFC",
      text: "#1A2D42", muted: "#5A7894", border: "#4A8AB5",
      lightLine: "#C0D2E4", hover: "#D8E4F0", select: "#C4D6E6",
      btnBg: "#3A7AB0", btnFg: "#FFFFFF", btnHover: "#2A6A9A",
      footer: "#7AA0C0", star: "#7AA0C0", starActive: "#3A7AB0",
      tagBg: "#D8E4F0", tagFg: "#1A2D42",
      toastBg: "#3A7AB0", toastFg: "#FFFFFF",
    },
    dark: {
      bg: "#0E1822", panelBg: "#16222E", cardBg: "#1A2A38",
      text: "#DCE6F0", muted: "#7A98B0", border: "#5AAAD5",
      lightLine: "#243342", hover: "#1E2A38", select: "#243648",
      btnBg: "#4A9AD0", btnFg: "#0A0E14", btnHover: "#6AB0E0",
      footer: "#6A8AAA", star: "#5A7A9A", starActive: "#4A9AD0",
      tagBg: "#243342", tagFg: "#DCE6F0",
      toastBg: "#4A9AD0", toastFg: "#0A0E14",
    },
  },

  // ----- Dusk -----
  // Existing dark Dusk stays as the dark variant (warm rose accent on
  // indigo-black). Light Dusk is a new pale-lavender-on-cream version —
  // gives users who like Dusk's identity a daytime option.
  Dusk: {
    light: {
      bg: "#F4F0F8", panelBg: "#E8E0F0", cardBg: "#FAF6FE",
      text: "#2A2438", muted: "#7A6890", border: "#9A6A98",
      lightLine: "#D8C8E0", hover: "#EADCE8", select: "#DCCEE4",
      btnBg: "#C06880", btnFg: "#FFFFFF", btnHover: "#A85870",
      footer: "#A088A0", star: "#A088A0", starActive: "#C06880",
      tagBg: "#EADCE8", tagFg: "#2A2438",
      toastBg: "#C06880", toastFg: "#FFFFFF",
    },
    dark: {
      bg: "#1E1E2E", panelBg: "#181828", cardBg: "#282840",
      text: "#E0E0F0", muted: "#8888AA", border: "#5A5A7A",
      lightLine: "#3A3A5A", hover: "#2E2E48", select: "#383858",
      btnBg: "#E06080", btnFg: "#FFFFFF", btnHover: "#C04868",
      footer: "#666688", star: "#666688", starActive: "#E06080",
      tagBg: "#3A3A5A", tagFg: "#E0E0F0",
      toastBg: "#E06080", toastFg: "#FFFFFF",
    },
  },

  // ----- Rose -----
  // Warm rose on blush white. Dark variant keeps the rose identity but on
  // a deep wine background with a lighter rose for text.
  Rose: {
    light: {
      bg: "#F9F2F4", panelBg: "#F2E4E8", cardBg: "#FDF8FA",
      text: "#3D2028", muted: "#9B7080", border: "#C07088",
      lightLine: "#E4C4D0", hover: "#F4DEE4", select: "#EED0DA",
      btnBg: "#B05878", btnFg: "#FFFFFF", btnHover: "#984868",
      footer: "#C09098", star: "#C09098", starActive: "#B05878",
      tagBg: "#F4DEE4", tagFg: "#3D2028",
      toastBg: "#B05878", toastFg: "#FFFFFF",
    },
    dark: {
      bg: "#1F1418", panelBg: "#2A1A22", cardBg: "#32202A",
      text: "#F2E0E4", muted: "#A89098", border: "#D08898",
      lightLine: "#3A2832", hover: "#2A1A22", select: "#3A2430",
      btnBg: "#D06888", btnFg: "#FFFFFF", btnHover: "#E07898",
      footer: "#A89098", star: "#7A6870", starActive: "#D06888",
      tagBg: "#3A2832", tagFg: "#F2E0E4",
      toastBg: "#D06888", toastFg: "#FFFFFF",
    },
  },
};

export type ThemeName = keyof typeof THEMES;
// ThemeColors is the resolved color set (one mode's worth), used by
// every component that consumes a theme. This keeps call sites simple —
// they do `THEMES[theme][mode]` once and get back a ThemeColors object
// identical in shape to what they used before.
// (ThemeColors is already exported as an interface above — no re-export
// needed here.)

export const THEME_ORDER: ThemeName[] = ["Mono", "Sage", "Ocean", "Dusk", "Rose"];