import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'signature' | 'eeert' | 'dark-vivid';

// Order also defines the toggle cycle (light → dark → signature → eeert → dark-vivid → light).
// Also the atomic class-removal list: every class we may have put on <html> appears here
// (dark-vivid's base 'dark' is already a member, so remove(...THEME_CLASSES) clears everything).
export const THEME_CLASSES: Theme[] = ['light', 'dark', 'signature', 'eeert', 'dark-vivid'];

// Classes applied to <html> per theme. 'dark-vivid' layers on the .dark token base so every
// `dark:` data tone (dataTones.ts) fires for free, while .dark-vivid overlays only the chrome.
export const THEME_DOM_CLASSES: Record<Theme, string[]> = {
  light: ['light'],
  dark: ['dark'],
  signature: ['signature'],
  eeert: ['eeert'],
  'dark-vivid': ['dark', 'dark-vivid'],
};

// "Colorful" themes share the pill/plate hero treatment (EEERT pilot behaviour). Gated at runtime
// in Metric/ItemCard/RoomCard/MaterialSummaryModal rather than via a CSS variant.
export const isColorfulTheme = (t: Theme) => t === 'eeert' || t === 'dark-vivid';

// Mobile browser status-bar color per theme. Signature ≈ the light surface;
// eeert ≈ its medium-grey page (hsl 216 16% 80%); dark-vivid ≈ its deep-indigo canvas.
const META_COLOR: Record<Theme, string> = {
  light: '#E4E8EE',
  dark: '#0D0814',
  signature: '#FCFCFD',
  eeert: '#C2CFE1',
  'dark-vivid': '#14162E',
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
  root.classList.add(...THEME_DOM_CLASSES[theme]);

  // Update Mobile Browser Status Bar
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', META_COLOR[theme]);
  }
};
