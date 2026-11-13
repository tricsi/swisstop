import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

// Keep in sync with the inline script in index.html.
const THEME_STORAGE_KEY = 'swiss-toplist-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function savedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/**
 * Light/dark theme. Follows the system setting until the user picks one;
 * the choice is then stored and applied as `<html data-theme="…">`.
 */
export function useTheme() {
  const [chosen, setChosen] = useState<Theme | null>(savedTheme);
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches);

  useEffect(() => {
    const query = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (chosen) document.documentElement.dataset.theme = chosen;
    else delete document.documentElement.dataset.theme;
  }, [chosen]);

  const theme: Theme = chosen ?? (systemDark ? 'dark' : 'light');

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setChosen(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this session only.
    }
  }, [theme]);

  return { theme, toggle };
}
