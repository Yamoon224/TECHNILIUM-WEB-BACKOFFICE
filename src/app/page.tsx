"use client";

import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/AccountPanel";
import { LoginForm } from "@/components/LoginForm";
import { LogoMark } from "@/components/LogoMark";
import { AuthError, TOKEN_STORAGE_KEY, fetchCurrentUser, login, logout, type User } from "@/lib/auth";

type SessionStatus = "checking" | "ready";

export default function Home() {
  const [hasStoredToken] = useState(
    () => typeof window !== "undefined" && Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
  );
  const [status, setStatus] = useState<SessionStatus>(hasStoredToken ? "checking" : "ready");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasStoredToken) {
      return;
    }

    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      return;
    }

    fetchCurrentUser(stored)
      .then((fetchedUser) => {
        setToken(stored);
        setUser(fetchedUser);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setStatus("ready"));
  }, [hasStoredToken]);

  async function handleLogin(email: string, password: string) {
    setSubmitting(true);
    setError(null);

    try {
      const result = await login(email, password, "technilium-backoffice-web");
      localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      setToken(result.token);
      setUser(result.user);
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Connexion impossible. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    if (token) {
      await logout(token).catch(() => undefined);
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      <LogoMark />

      {status === "checking" ? (
        <p className="text-sm text-ink-soft">Vérification de la session…</p>
      ) : user && token ? (
        <AccountPanel user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onSubmit={handleLogin} submitting={submitting} error={error} />
      )}
    </main>
  );
}
