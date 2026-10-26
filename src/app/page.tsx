"use client";

import { useState } from "react";
import { AccountPanel } from "@/components/AccountPanel";
import { BackofficeNav } from "@/components/BackofficeNav";
import { LoginForm } from "@/components/LoginForm";
import { LogoMark } from "@/components/LogoMark";
import { AuthError, useAuth } from "@/lib/useAuth";

export default function Home() {
  const { status, token, user, login, logout } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Connexion impossible. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (user && token) {
    return (
      <div className="flex min-h-screen flex-1 flex-col">
        <BackofficeNav onLogout={logout} />
        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
          <AccountPanel user={user} onLogout={logout} />
        </main>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <LogoMark />

      {status === "checking" ? (
        <p className="text-sm text-ink-soft">Vérification de la session…</p>
      ) : (
        <LoginForm onSubmit={handleLogin} submitting={submitting} error={error} />
      )}
    </main>
  );
}
