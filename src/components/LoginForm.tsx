"use client";

import { useState, type FormEvent } from "react";

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  submitting: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, submitting, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(email, password);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-sm border border-line bg-surface p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-medium text-ink">Connexion backoffice</h1>
        <p className="text-sm text-ink-soft">Réservé à l&apos;équipe et aux vendeurs Technilium.</p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Adresse e-mail
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-sm border border-line bg-bg px-3 py-2 text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
          placeholder="prenom.nom@technilium.app"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-ink-soft">
        Mot de passe
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-sm border border-line bg-bg px-3 py-2 text-ink focus:border-gold focus:outline-none"
        />
      </label>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-sm bg-gold px-4 py-2 text-sm font-medium text-bg transition-colors hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
