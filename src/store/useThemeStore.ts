import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          updateDomClass(newTheme);
          return { theme: newTheme };
        }),
      setTheme: (theme) => {
        updateDomClass(theme);
        set({ theme });
      },
    }),
    {
      name: 'marnthara-theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) updateDomClass(state.theme);
      },
    }
  )
);

const updateDomClass = (theme: Theme) => {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);

  // Update Mobile Browser Status Bar
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  // Dark: Deep Violet Black (#0D0814) matches --bg-main
  // Light: Soft Lavender (#FBFBFE)
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0D0814' : '#FBFBFE');
  }
};
