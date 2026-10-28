"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useAppearance } from "./AppearanceProvider";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "placeholder"> {
  /** The floating label text. */
  label: ReactNode;
}

/** A password field with a floating label and an eye button that shows or hides what was typed. */
export function PasswordInput({ label, className = "", ...rest }: PasswordInputProps) {
  const { tr } = useAppearance();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <label className="field">
      <input
        {...rest}
        type={visible ? "text" : "password"}
        placeholder=" "
        className={`rounded-sm border border-line bg-bg px-3 pr-11 text-ink focus:border-gold focus:outline-none ${className}`}
      />
      <span className="field-label">{label}</span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? tr("Masquer le mot de passe") : tr("Afficher le mot de passe")}
        aria-pressed={visible}
        className="absolute bottom-0.5 right-0 rounded-sm p-1.5 text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-gold"
      >
        <Icon className="h-5 w-5" aria-hidden />
      </button>
    </label>
  );
}
