import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { THEMES, type Theme, type ThemeKey, type Density } from '../themes.ts';

interface ThemeContextValue {
  theme: Theme;
  themeKey: ThemeKey;
  setTheme: (key: ThemeKey) => void;
  density: Density;
  setDensity: (d: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY_THEME = 'aegismail.theme';
const STORAGE_KEY_DENSITY = 'aegismail.density';

function loadThemeKey(): ThemeKey {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  if (stored && stored in THEMES) return stored as ThemeKey;
  return 'graphite';
}

function loadDensity(): Density {
  const stored = localStorage.getItem(STORAGE_KEY_DENSITY);
  if (stored === 'compact' || stored === 'comfortable' || stored === 'spacious') {
    return stored;
  }
  return 'comfortable';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(loadThemeKey);
  const [density, setDensity] = useState<Density>(loadDensity);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, themeKey);
    document.documentElement.style.colorScheme =
      themeKey === 'paper' ? 'light' : 'dark';
  }, [themeKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DENSITY, density);
  }, [density]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: THEMES[themeKey],
      themeKey,
      setTheme: setThemeKey,
      density,
      setDensity,
    }),
    [themeKey, density],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme used outside ThemeProvider');
  return ctx;
}
