"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { useAppearance } from "./AppearanceProvider";

type Language = "fr" | "en";

/**
 * The same texts in the two languages of the store, one tab each: Français
 * (the reference) and Anglais (US). Both panels' fields belong to the parent,
 * so what was typed in a tab is kept when switching.
 */
export function LanguageTabs({ fr, en, enFilled = false }: { fr: ReactNode; en: ReactNode; /** Marks the English tab when it already holds text. */ enFilled?: boolean }) {
  const { tr } = useAppearance();
  const [active, setActive] = useState<Language>("fr");
  const id = useId();
  const tabs: { key: Language; label: string }[] = [
    { key: "fr", label: tr("Français") },
    { key: "en", label: tr("Anglais (US)") },
  ];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setActive((current) => (current === "fr" ? "en" : "fr"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={tr("Langue des textes")} className="flex gap-1 border-b border-line">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${id}-tab-${key}`}
            aria-selected={active === key}
            aria-controls={`${id}-panel-${key}`}
            tabIndex={active === key ? 0 : -1}
            onClick={() => setActive(key)}
            onKeyDown={onKeyDown}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active === key ? "border-gold text-gold" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {label}
            {key === "en" && enFilled ? <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden /> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${id}-panel-${active}`} aria-labelledby={`${id}-tab-${active}`} className="flex flex-col gap-4">
        {active === "fr" ? fr : en}
      </div>
    </div>
  );
}
