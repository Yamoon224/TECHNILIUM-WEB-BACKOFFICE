"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import {
  InventoryError,
  listLowStock,
  listMovements,
  recordMovement,
  type LowStockOffer,
  type StockMovement,
} from "@/lib/inventory";

export default function StockPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [lowStock, setLowStock] = useState<LowStockOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    Promise.all([listMovements(token), listLowStock(token)])
      .then(([movementList, lowStockList]) => {
        setMovements(movementList);
        setLowStock(lowStockList);
      })
      .catch((caught) => setError(caught instanceof InventoryError ? caught.message : "Stock indisponible."))
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

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder au stock.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-8 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Stock</h1>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <NewMovementForm
          onSubmit={async (input) => {
            if (!token) return;
            const created = await recordMovement(token, input);
            setMovements((current) => [created, ...current]);
            refresh();
          }}
        />

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Stock faible</h2>
          {loading ? (
            <p className="text-sm text-ink-soft">Chargement…</p>
          ) : lowStock.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune offre en stock faible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="py-2 pr-4 font-medium">Produit</th>
                    <th className="py-2 pr-4 font-medium">SKU</th>
                    <th className="py-2 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((offer) => (
                    <tr key={offer.offer_id} className="border-b border-line">
                      <td className="py-3 pr-4 text-ink">
                        {offer.brand} {offer.product_name}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{offer.sku}</td>
                      <td className="py-3 text-danger">{offer.stock_quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-ink">Historique des mouvements</h2>
          {loading ? (
            <p className="text-sm text-ink-soft">Chargement…</p>
          ) : movements.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucun mouvement enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="py-2 pr-4 font-medium">Offre</th>
                    <th className="py-2 pr-4 font-medium">Variation</th>
                    <th className="py-2 pr-4 font-medium">Stock après</th>
                    <th className="py-2 font-medium">Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b border-line">
                      <td className="py-3 pr-4 text-ink-soft">#{movement.offer_id}</td>
                      <td className={`py-3 pr-4 ${movement.quantity_delta >= 0 ? "text-gold" : "text-danger"}`}>
                        {movement.quantity_delta > 0 ? "+" : ""}
                        {movement.quantity_delta}
                      </td>
                      <td className="py-3 pr-4 text-ink">{movement.quantity_after}</td>
                      <td className="py-3 text-ink-soft">{movement.reason ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function NewMovementForm({
  onSubmit,
}: {
  onSubmit: (input: { offer_id: number; quantity_delta: number; reason?: string }) => Promise<void>;
}) {
  const [offerId, setOfferId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!offerId || !delta) {
      setFormError("L'offre et la variation sont requises.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ offer_id: Number(offerId), quantity_delta: Number(delta), reason: reason || undefined });
      setOfferId("");
      setDelta("");
      setReason("");
    } catch (caught) {
      setFormError(caught instanceof InventoryError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        ID offre
        <input
          type="number"
          value={offerId}
          onChange={(event) => setOfferId(event.target.value)}
          className="w-24 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Variation (+/-)
        <input
          type="number"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
          placeholder="+20 ou -5"
          className="w-28 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Motif
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Réception fournisseur, casse…"
          className="w-56 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <Button type="submit" disabled={submitting}>
        Enregistrer
      </Button>

      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}
