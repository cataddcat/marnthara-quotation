import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'signature';

// Order also defines the toggle cycle (light → dark → signature → light).
const THEME_CLASSES: Theme[] = ['light', 'dark', 'signature'];

// Mobile browser status-bar color per theme. Signature ≈ the light surface.
const META_COLOR: Record<Theme, string> = {
  light: '#E4E8EE',
  dark: '#0D0814',
  signature: '#FCFCFD',
};

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
          const idx = THEME_CLASSES.indexOf(state.theme);
          const newTheme = THEME_CLASSES[(idx + 1) % THEME_CLASSES.length];
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
  root.classList.remove(...THEME_CLASSES);
  root.classList.add(theme);

  // Update Mobile Browser Status Bar
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', META_COLOR[theme]);
  }
};
