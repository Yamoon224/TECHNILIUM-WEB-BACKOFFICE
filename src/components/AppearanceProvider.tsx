"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  cssVariables,
  DEFAULT_APPEARANCE,
  loadAppearance,
  MANAGED_VARIABLES,
  resolveTheme,
  saveAppearance,
  type Appearance,
} from "@/lib/appearance";
import { translate, type MessageKey } from "@/lib/i18n";
import { format, PHRASES_EN } from "@/lib/phrases";

interface AppearanceContextValue {
  appearance: Appearance;
  theme: "light" | "dark";
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
  t: (key: MessageKey) => string;
  /** Translates a page's French text (falls back to the French when no English exists). */
  tr: (french: string) => string;
  /** Translates a French sentence with {name} placeholders, then fills them. */
  trf: (french: string, values: Record<string, string | number>) => string;
}

export const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/**
 * Holds the appearance choices, persists them on this device and applies them
 * to the document: theme and language as attributes, colours as CSS variables.
 * Starts from the defaults and reads storage after mount, so server and first
 * client render agree (an inline script in the layout sets the theme before
 * paint to avoid a flash).
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    // Storage and media queries only exist in the browser, hence after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance(loadAppearance());

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(query.matches);

    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  const theme = resolveTheme(appearance.theme, systemDark);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = theme;
    root.lang = appearance.language;

    for (const name of MANAGED_VARIABLES) root.style.removeProperty(name);
    for (const [name, value] of Object.entries(cssVariables(appearance, theme))) root.style.setProperty(name, value);
  }, [appearance, theme]);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...patch };
      saveAppearance(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    setAppearance(DEFAULT_APPEARANCE);
  }, []);

  const language = appearance.language;
  const tr = useCallback((french: string) => (language === "en" ? (PHRASES_EN[french] ?? french) : french), [language]);

  const trf = useCallback((french: string, values: Record<string, string | number>) => format(tr(french), values), [tr]);

  const value = useMemo<AppearanceContextValue>(
    () => ({ appearance, theme, update, reset, t: (key) => translate(language, key), tr, trf }),
    [appearance, theme, update, reset, language, tr, trf],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return context;
}
