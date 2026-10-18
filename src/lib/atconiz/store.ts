import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

type AppState = {
  theme: Theme;
  currency: string;
  compareIds: string[];
  setTheme: (t: Theme) => void;
  setCurrency: (c: string) => void;
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
};

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("light", theme === "light");
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      currency: "USD",
      compareIds: [],
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setCurrency: (currency) => set({ currency }),
      toggleCompare: (id) => {
        const cur = get().compareIds;
        if (cur.includes(id)) set({ compareIds: cur.filter((x) => x !== id) });
        else if (cur.length < 4) set({ compareIds: [...cur, id] });
      },
      clearCompare: () => set({ compareIds: [] }),
    }),
    {
      name: "atconiz-ui",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);
