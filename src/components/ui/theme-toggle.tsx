"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const storageKey = "ficha_theme_preference";
const oneYear = 60 * 60 * 24 * 365;

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") return "light";

  const current = document.documentElement.dataset.theme;
  if (current === "light" || current === "dark") return current;

  return getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new CustomEvent("themechange"));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("themechange", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("themechange", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");
  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(storageKey, nextTheme);
    } catch {
      // Theme preference is optional; the active DOM theme still changes.
    }

    document.cookie = `${storageKey}=${nextTheme}; path=/; max-age=${oneYear}; samesite=lax`;
  }

  return (
    <button
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-pressed={isDark}
      className="theme-toggle"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true" className="theme-toggle__track">
        <span className="theme-toggle__thumb" />
      </span>
      <span className="theme-toggle__label">{isDark ? "Escuro" : "Claro"}</span>
    </button>
  );
}
