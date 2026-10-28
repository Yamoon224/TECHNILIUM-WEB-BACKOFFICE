"use client";

import { useState, type FormEvent } from "react";
import { useAppearance } from "./AppearanceProvider";
import { LogoMark } from "./LogoMark";
import { PasswordInput } from "./PasswordInput";

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  submitting: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, submitting, error }: LoginFormProps) {
  const { t } = useAppearance();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(email, password);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-sm border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex justify-center">
        <LogoMark />
      </div>

      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-lg font-medium text-ink">{t("login.title")}</h1>
        <p className="text-sm text-ink-soft">{t("login.subtitle")}</p>
      </div>

      <label className="field">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-sm border border-line bg-bg px-3 py-2 text-ink focus:border-gold focus:outline-none"
          placeholder="prenom.nom@technilium.app"
        />
        <span className="field-label">{t("login.email")}</span>
      </label>

      <PasswordInput
        required
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        label={t("login.password")}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-sm bg-gold px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? t("login.submitting") : t("login.submit")}
      </button>
    </form>
  );
}
