'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  resolveTheme,
  parseStoredTheme,
  nextTheme,
  type Theme,
} from '../app/theme-provider-utils';

const STORAGE_KEY = 'crashlab:theme';

interface ThemeContextType {
  theme: Theme;
  toggle: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggle: () => {},
  mounted: false,
});

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseStoredTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<Theme | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrate theme from localStorage / system preference after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only theme hydration
    setUserTheme(getStoredTheme());
    setSystemPrefersDark(getSystemPrefersDark());
    setMounted(true);
  }, []);

  const theme = useMemo<Theme>(
    () => resolveTheme(userTheme, systemPrefersDark),
    [systemPrefersDark, userTheme],
  );

  // Keep the effective theme in sync when the OS-level color scheme changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Keep multiple tabs in sync when the user changes their override elsewhere.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setUserTheme(parseStoredTheme(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
      setUserTheme((prev) => {
        const next = nextTheme(prev ?? theme);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        return next;
      });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
