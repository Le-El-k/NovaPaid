"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "mixed";

const THEME_KEY = "novapaid_theme";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "mixed") return saved;
  } catch {}
  // Base theme is white (light). Do not follow the OS dark preference —
  // dark/mixed only apply when the user explicitly picks them.
  return "light";
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.remove("theme-light", "theme-dark", "theme-mixed");
  root.classList.add(`theme-${theme}`);
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

const themeOrder: ThemeMode[] = ["light", "dark", "mixed"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    applyTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const idx = themeOrder.indexOf(prev);
      const next = themeOrder[(idx + 1) % themeOrder.length];
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeSelector({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeMode; icon: string; label: string }[] = [
    { value: "light", icon: "☀️", label: "Clair" },
    { value: "dark", icon: "🌙", label: "Sombre" },
    { value: "mixed", icon: "◐", label: "Mixte" },
  ];

  return (
    <div className={`np-theme-selector ${className}`} role="group" aria-label="Choisir le thème">
      {themes.map(t => (
        <button
          key={t.value}
          type="button"
          className={`np-theme-btn ${theme === t.value ? "is-active" : ""}`}
          onClick={() => setTheme(t.value)}
          title={t.label}
          aria-pressed={theme === t.value}
        >
          <span className="np-theme-icon">{t.icon}</span>
          <span className="np-theme-label">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const icons: Record<ThemeMode, string> = { light: "☀️", dark: "🌙", mixed: "◐" };
  return (
    <button
      type="button"
      className={`np-theme-toggle ${className}`}
      onClick={toggleTheme}
      title={`Thème: ${theme}`}
      aria-label={`Changer de thème (actuel: ${theme})`}
    >
      {icons[theme]}
    </button>
  );
}
