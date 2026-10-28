"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { useAuth } from "@/lib/useAuth";
import {
  VendorsError,
  approveVendor,
  listVendors,
  reactivateVendor,
  suspendVendor,
  type Vendor,
  type VendorStatus,
} from "@/lib/vendors";

const STATUS_LABEL: Record<VendorStatus, string> = {
  pending: "En attente",
  active: "Actif",
  suspended: "Suspendu",
};

export default function VendorsPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filter, setFilter] = useState<VendorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listVendors(token, filter ?? undefined)
      .then(setVendors)
      .catch((caught) => setError(caught instanceof VendorsError ? caught.message : "Vendeurs indisponibles."))
      .finally(() => setLoading(false));
  }, [token, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleAction(id: number, action: "approve" | "suspend" | "reactivate") {
    if (!token) return;
    setPendingId(id);
    setError(null);
    try {
      const fn = action === "approve" ? approveVendor : action === "suspend" ? suspendVendor : reactivateVendor;
      const updated = await fn(token, id);
      setVendors((current) => current.map((vendor) => (vendor.id === id ? updated : vendor)));
    } catch (caught) {
      setError(caught instanceof VendorsError ? caught.message : "L'action a échoué.");
    } finally {
      setPendingId(null);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder aux vendeurs.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Vendeurs tiers</h1>

        <nav className="flex flex-wrap gap-2">
          <FilterPill active={filter === null} onClick={() => setFilter(null)}>
            Tous
          </FilterPill>
          {(["pending", "active", "suspended"] as const).map((value) => (
            <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
              {STATUS_LABEL[value]}
            </FilterPill>
          ))}
        </nav>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun vendeur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Entreprise</th>
                  <th className="py-2 pr-4 font-medium">Téléphone</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-ink">{vendor.company_name}</td>
                    <td className="py-3 pr-4 text-ink-soft">{vendor.phone}</td>
                    <td className="py-3 pr-4 text-ink-soft">{STATUS_LABEL[vendor.status]}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {vendor.status === "pending" ? (
                          <button
                            type="button"
                            disabled={pendingId === vendor.id}
                            onClick={() => handleAction(vendor.id, "approve")}
                            className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
                          >
                            Approuver
                          </button>
                        ) : null}
                        {vendor.status === "active" ? (
                          <button
                            type="button"
                            disabled={pendingId === vendor.id}
                            onClick={() => handleAction(vendor.id, "suspend")}
                            className="rounded-sm border border-danger px-2 py-1 text-xs text-danger transition-colors disabled:opacity-50"
                          >
                            Suspendre
                          </button>
                        ) : null}
                        {vendor.status === "suspended" ? (
                          <button
                            type="button"
                            disabled={pendingId === vendor.id}
                            onClick={() => handleAction(vendor.id, "reactivate")}
                            className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
                          >
                            Réactiver
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}
