import { create } from 'zustand';
import type { ThemeName } from '@/lib/constants';

export interface User {
  id: string;
  email: string;
  name: string | null;
  theme: string;
}

export interface GlimmerEntry {
  id: string;
  date: string;
  promptIndex: number;
  promptLabel: string;
  response: string;
  preState: string;
  postState: string;
  intensity: number;
  duration: string;
  bodyLocation: string;
  tags: string;
  sleepQuality: number;
  stressLevel: number;
  starred: boolean;
  createdAt: string;
}

export interface Stats {
  total: number;
  starred: number;
  stateCounts: Record<string, number>;
  shifts: Record<string, number>;
  avgIntensity: number;
  tagCounts: Record<string, number>;
  last7: { date: string; avgIntensity: number; count: number }[];
  streak: number;
  uniqueDates: string[];
}

interface JournalStore {
  user: User | null;
  setUser: (user: User | null) => void;
  entries: GlimmerEntry[];
  totalEntries: number;
  setEntries: (entries: GlimmerEntry[], total: number) => void;
  addEntry: (entry: GlimmerEntry) => void;
  updateEntry: (id: string, data: Partial<GlimmerEntry>) => void;
  removeEntry: (id: string) => void;
  stats: Stats | null;
  setStats: (stats: Stats) => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  milestoneMessage: string | null;
  showMilestone: (msg: string) => void;
}

export const useJournalStore = create<JournalStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  entries: [],
  totalEntries: 0,
  setEntries: (entries, total) => set({ entries, totalEntries: total }),
  addEntry: (entry) =>
    set((s) => ({
      entries: [entry, ...s.entries],
      totalEntries: s.totalEntries + 1,
    })),
  updateEntry: (id, data) =>
    set((s) => ({
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
    })),
  removeEntry: (id) =>
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
      totalEntries: s.totalEntries - 1,
    })),
  stats: null,
  setStats: (stats) => set({ stats }),
  theme: 'Mono',
  setTheme: (theme) => set({ theme }),
  activeTab: 'daily',
  setActiveTab: (tab) => set({ activeTab: tab }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedDate: new Date().toISOString().split('T')[0],
  setSelectedDate: (date) => set({ selectedDate: date }),
  toastMessage: null,
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => set({ toastMessage: null }), 3000);
  },
  milestoneMessage: null,
  showMilestone: (msg) => {
    set({ milestoneMessage: msg });
    setTimeout(() => set({ milestoneMessage: null }), 5000);
  },
}));
