"use client";

import * as React from "react";

/**
 * Lightweight dark/light/system theme provider.
 *
 * Why not `next-themes`? Versions <= 0.4.6 inject a raw `<script>` element
 * *inside* the React component tree, which React 19 (bundled with Next 16)
 * refuses to render — surfacing as:
 *   "Encountered a script tag while rendering React component."
 * See https://github.com/pacocoursey/next-themes/issues/387.
 *
 * This drop-in replacement:
 *   - Applies `class="dark"` on <html> based on system / user preference.
 *   - Persists the choice in `localStorage`.
 *   - Emits no in-tree `<script>` tag (the initial-flash guard lives in
 *     `layout.tsx` as a dangerouslySetInnerHTML in <head>, which React 19
 *     accepts because it's not part of the component render output).
 *   - Exposes a `useTheme()` hook whose surface matches next-themes closely
 *     (`theme`, `resolvedTheme`, `setTheme`) so existing consumers don't
 *     have to change.
 */

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "meicrypt.theme";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const readInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (privacy mode, iframe, etc.)
  }
  return "system";
};

const resolve = (t: Theme): ResolvedTheme => {
  if (t !== "system") return t;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyThemeClass = (resolved: ResolvedTheme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    "light",
  );

  // Hydrate from storage on mount.
  React.useEffect(() => {
    const initial = readInitialTheme();
    const resolved = resolve(initial);
    setThemeState(initial);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  // React to OS-level changes when in "system" mode.
  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: ResolvedTheme = mq.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyThemeClass(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    const resolved = resolve(t);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      // best-effort persistence
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Match next-themes: hook returns safe defaults when used outside the
    // provider (e.g. during a Storybook story or a Server Component test).
    return {
      theme: "system",
      resolvedTheme: "light",
      setTheme: () => undefined,
    };
  }
  return ctx;
};

/**
 * Inline script that runs *before* React hydration to prevent a
 * light/dark flash. Meant to be placed in `<head>` via
 * `dangerouslySetInnerHTML` — React 19 accepts this pattern, unlike a bare
 * `<script>` element inside a component's return.
 */
export const themeBootstrapScript = `
(function(){try{
  var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  var t=(s==='light'||s==='dark'||s==='system')?s:'system';
  var d=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:t==='dark';
  var e=document.documentElement;
  if(d)e.classList.add('dark');else e.classList.remove('dark');
  e.style.colorScheme=d?'dark':'light';
}catch(_){}})();
`.trim();
