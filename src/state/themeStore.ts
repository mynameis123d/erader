import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'sepia';
export type Density = 'standard' | 'compact' | 'cozy';

interface ThemeState {
  theme: ThemeMode;
  density: Density;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setDensity: (density: Density) => void;
}

const THEME_STORAGE_KEY = 'erader:theme';
const DENSITY_STORAGE_KEY = 'erader:density';

const isBrowser = typeof window !== 'undefined';

const applyTheme = (mode: ThemeMode) => {
  if (!isBrowser) return;
  const root = document.documentElement;
  root.dataset.theme = mode;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
};

const applyDensity = (density: Density) => {
  if (!isBrowser) return;
  const root = document.documentElement;
  root.dataset.density = density === 'standard' ? '' : density;
  if (density === 'standard') {
    root.removeAttribute('data-density');
  } else {
    root.dataset.density = density;
  }
  window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
};

const getInitialTheme = (): ThemeMode => {
  if (!isBrowser) return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
  if (stored === 'light' || stored === 'dark' || stored === 'sepia') {
    return stored;
  }
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

const getInitialDensity = (): Density => {
  if (!isBrowser) return 'standard';
  const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY) as Density | null;
  if (stored === 'standard' || stored === 'compact' || stored === 'cozy') {
    return stored;
  }
  return 'standard';
};

const initialTheme = getInitialTheme();
const initialDensity = getInitialDensity();

applyTheme(initialTheme);
applyDensity(initialDensity);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  density: initialDensity,
  toggleTheme: () =>
    set((state) => {
      const nextTheme: ThemeMode = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);
      return { theme: nextTheme };
    }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  setDensity: (density) => {
    applyDensity(density);
    set({ density });
  },
}));
