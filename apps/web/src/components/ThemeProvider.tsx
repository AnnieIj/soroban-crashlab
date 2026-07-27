'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { STORAGE_KEY, parseTheme, resolveEffectiveTheme, nextToggledTheme, type Theme } from './theme-utils';

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
    return parseTheme(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function subscribeToMount(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  // Trigger once on subscribe (post-hydration)
  const id = requestAnimationFrame(() => cb());
  return () => cancelAnimationFrame(id);
}

function getMountSnapshot(): boolean {
  return typeof document !== 'undefined';
}

function getMountServerSnapshot(): boolean {
  return false;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<Theme | null>(getStoredTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark);
  const mounted = useSyncExternalStore(subscribeToMount, getMountSnapshot, getMountServerSnapshot);

  const theme = useMemo<Theme>(
    () => resolveEffectiveTheme(userTheme, systemPrefersDark),
    [userTheme, systemPrefersDark],
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
      setUserTheme(parseTheme(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback(() => {
    setUserTheme((prev) => {
      const next = nextToggledTheme(prev, systemPrefersDark);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [systemPrefersDark]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}
