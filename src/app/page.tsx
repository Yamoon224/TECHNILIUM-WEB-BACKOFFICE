"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import { useAppearance } from "@/components/AppearanceProvider";
import { BackofficeNav } from "@/components/BackofficeNav";
import { LoginForm } from "@/components/LoginForm";
import { isVendorOnly } from "@/lib/roles";
import { AuthError, useAuth } from "@/lib/useAuth";

export default function Home() {
  const { t, tr } = useAppearance();
  const router = useRouter();
  const { status, token, user, login, logout } = useAuth();
  const vendorOnly = user ? isVendorOnly(user.roles) : false;

  useEffect(() => {
    // A third-party vendor's home is the vendor space: there is no staff dashboard for them.
    if (vendorOnly) router.replace("/espace-vendeur");
  }, [vendorOnly, router]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(email: string, password: string) {
    setSubmitting(true);
    setError(null);

    try {
      await login(email, password);
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : tr("Connexion impossible. Réessayez."));
    } finally {
      setSubmitting(false);
    }
  }

  if (user && token) {
    return (
      <div className="flex flex-1 flex-col">
        <BackofficeNav onLogout={logout} roles={user.roles} />
        <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
          {vendorOnly ? <p className="text-sm text-ink-soft">{tr("Redirection vers votre espace vendeur…")}</p> : <Dashboard token={token} user={user} />}
        </main>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 px-4 py-16">
      {status === "checking" ? (
        <p className="text-sm text-ink-soft">{t("login.checking")}</p>
      ) : (
        <LoginForm onSubmit={handleLogin} submitting={submitting} error={error} />
      )}
    </main>
  );
}
