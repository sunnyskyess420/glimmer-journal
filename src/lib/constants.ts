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

export const THEMES = {
  Mono: {
    bg: "#FFFFFF", panelBg: "#F8F8F8", cardBg: "#FFFFFF",
    text: "#111111", muted: "#666666", border: "#111111",
    lightLine: "#CCCCCC", hover: "#F0F0F0", select: "#E8E8E8",
    btnBg: "#111111", btnFg: "#FFFFFF", btnHover: "#333333",
    footer: "#888888", star: "#999999", starActive: "#111111",
    tagBg: "#F0F0F0", tagFg: "#111111",
    toastBg: "#111111", toastFg: "#FFFFFF",
  },
  Sage: {
    bg: "#F0F4EC", panelBg: "#E4EAE0", cardBg: "#FAFCF8",
    text: "#2A3528", muted: "#6B7D68", border: "#6B9E5C",
    lightLine: "#C8D8C0", hover: "#DEE8D4", select: "#D0DEC4",
    btnBg: "#5A8A4A", btnFg: "#FFFFFF", btnHover: "#4A7A3A",
    footer: "#8BA888", star: "#8BA888", starActive: "#5A8A4A",
    tagBg: "#E0EADA", tagFg: "#2A3528",
    toastBg: "#5A8A4A", toastFg: "#FFFFFF",
  },
  Ocean: {
    bg: "#EDF3F9", panelBg: "#E0EAF4", cardBg: "#F8FAFC",
    text: "#1A2D42", muted: "#5A7894", border: "#4A8AB5",
    lightLine: "#C0D2E4", hover: "#D8E4F0", select: "#C4D6E6",
    btnBg: "#3A7AB0", btnFg: "#FFFFFF", btnHover: "#2A6A9A",
    footer: "#7AA0C0", star: "#7AA0C0", starActive: "#3A7AB0",
    tagBg: "#D8E4F0", tagFg: "#1A2D42",
    toastBg: "#3A7AB0", toastFg: "#FFFFFF",
  },
  Dusk: {
    bg: "#1E1E2E", panelBg: "#181828", cardBg: "#282840",
    text: "#E0E0F0", muted: "#8888AA", border: "#5A5A7A",
    lightLine: "#3A3A5A", hover: "#2E2E48", select: "#383858",
    btnBg: "#E06080", btnFg: "#FFFFFF", btnHover: "#C04868",
    footer: "#666688", star: "#666688", starActive: "#E06080",
    tagBg: "#3A3A5A", tagFg: "#E0E0F0",
    toastBg: "#E06080", toastFg: "#FFFFFF",
  },
  Rose: {
    bg: "#F9F2F4", panelBg: "#F2E4E8", cardBg: "#FDF8FA",
    text: "#3D2028", muted: "#9B7080", border: "#C07088",
    lightLine: "#E4C4D0", hover: "#F4DEE4", select: "#EED0DA",
    btnBg: "#B05878", btnFg: "#FFFFFF", btnHover: "#984868",
    footer: "#C09098", star: "#C09098", starActive: "#B05878",
    tagBg: "#F4DEE4", tagFg: "#3D2028",
    toastBg: "#B05878", toastFg: "#FFFFFF",
  },
} as const;

export type ThemeName = keyof typeof THEMES;
export type ThemeColors = (typeof THEMES)[ThemeName];

export const THEME_ORDER: ThemeName[] = ["Mono", "Sage", "Ocean", "Dusk", "Rose"];