'use client';
import * as React from 'react';

type Theme = 'dark' | 'light';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} });

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise to the same value the server renders ('dark') so the first client
  // render matches the SSR output — otherwise reading the persisted theme here
  // would diverge from the server and trigger a hydration mismatch (the Nav
  // toggle icon differs). After mount we adopt the real theme that ThemeScript
  // already applied to <html> from localStorage. The page background never
  // flashes (ThemeScript sets data-theme pre-paint); only the toggle icon settles.
  const [theme, setTheme] = React.useState<Theme>('dark');

  React.useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('sts-theme', next);
    } catch {}
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
