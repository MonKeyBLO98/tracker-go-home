import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  activeProfileId: number | null;
  activeProfileName: string | null;
  setActiveProfile: (id: number | null, name: string | null) => void;
  scrapingFrequency: "24h" | "1week" | "manual";
  setScrapingFrequency: (freq: "24h" | "1week" | "manual") => void;
  lastScraping: string | null;
  setLastScraping: (date: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeProfileId: null,
      activeProfileName: null,
      setActiveProfile: (id, name) =>
        set({ activeProfileId: id, activeProfileName: name }),
      scrapingFrequency: "24h",
      setScrapingFrequency: (freq) => set({ scrapingFrequency: freq }),
      lastScraping: null,
      setLastScraping: (date) => set({ lastScraping: date }),
    }),
    {
      name: "tgh-app-settings",
    }
  )
);
