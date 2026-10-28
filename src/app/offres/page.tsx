"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { useAuth } from "@/lib/useAuth";
import { CatalogError, approveOffer, listOffersForModeration, rejectOffer, type ModeratedOffer } from "@/lib/catalog";

export default function OfferModerationPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [offers, setOffers] = useState<ModeratedOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listOffersForModeration(token)
      .then(setOffers)
      .catch((caught) => setError(caught instanceof CatalogError ? caught.message : "Offres indisponibles."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleDecision(id: number, decision: "approve" | "reject") {
    if (!token) return;
    setPendingId(id);
    setError(null);
    try {
      await (decision === "approve" ? approveOffer(token, id) : rejectOffer(token, id));
      setOffers((current) => current.filter((offer) => offer.id !== id));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "La décision a échoué.");
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
        <p className="text-ink-soft">Connectez-vous pour accéder à la modération.</p>
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
        <h1 className="font-display text-2xl font-semibold text-ink">Modération des offres vendeurs</h1>
        <p className="text-sm text-ink-soft">Offres soumises par des vendeurs tiers, en attente de publication.</p>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : offers.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune offre en attente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Produit</th>
                  <th className="py-2 pr-4 font-medium">Vendeur</th>
                  <th className="py-2 pr-4 font-medium">Prix</th>
                  <th className="py-2 pr-4 font-medium">Stock</th>
                  <th className="py-2 font-medium">Décision</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-ink">
                      {offer.brand} {offer.product_name}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">Vendeur #{offer.vendor_id}</td>
                    <td className="py-3 pr-4 text-ink">
                      {offer.price_amount.toLocaleString("fr-FR")} {offer.currency}
                    </td>
                    <td className="py-3 pr-4 text-ink">{offer.stock_quantity}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pendingId === offer.id}
                          onClick={() => handleDecision(offer.id, "approve")}
                          className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          type="button"
                          disabled={pendingId === offer.id}
                          onClick={() => handleDecision(offer.id, "reject")}
                          className="rounded-sm border border-danger px-2 py-1 text-xs text-danger transition-colors disabled:opacity-50"
                        >
                          Rejeter
                        </button>
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
