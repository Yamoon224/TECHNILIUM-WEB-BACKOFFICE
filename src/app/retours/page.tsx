"use client";

import { useAppearance } from "@/components/AppearanceProvider";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import { parseOptionalAmount, parseReturnItems } from "@/lib/input";
import { formatMoney } from "@/lib/money";
import {
  RETURN_ACTION_LABEL,
  RETURN_STATUS_LABEL,
  ReturnsError,
  availableActions,
  decideReturn,
  listReturns,
  openReturn,
  type ReturnAction,
  type ReturnRequest,
  type ReturnStatus,
} from "@/lib/returns";

const FILTERS: ReturnStatus[] = ["requested", "accepted", "received", "refunded", "rejected"];

export default function ReturnsPage() {
  const { tr } = useAppearance();
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [filter, setFilter] = useState<ReturnStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listReturns(token, { status: filter ?? undefined })
      .then(setReturns)
      .catch((caught) => setError(caught instanceof ReturnsError ? caught.message : tr("Retours indisponibles.")))
      .finally(() => setLoading(false));
  }, [token, filter, tr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleAction(item: ReturnRequest, action: ReturnAction) {
    if (!token) return;

    const body: { note?: string; amount?: number; restock?: boolean } = {};

    if (action === "reject") {
      const note = window.prompt("Motif du refus ?");
      if (!note) return;
      body.note = note;
    }

    if (action === "receive" && item.items.length > 0) {
      // The inspector decides: resellable articles go back on sale, damaged ones do not.
      body.restock = window.confirm(
        "Articles revendables en l'état ? OK = remettre en stock, Annuler = ne pas remettre en stock.",
      );
    }

    if (action === "refund") {
      const input = window.prompt(
        `Montant à rembourser (demandé : ${item.requested_amount}). Laisser vide pour le montant demandé. Le paiement correspondant est remboursé automatiquement.`,
      );
      if (input === null) return;
      const amount = parseOptionalAmount(input);
      if (amount === null) {
        setError("Montant invalide : saisissez un entier positif.");
        return;
      }
      if (amount !== undefined) body.amount = amount;
    }

    setBusyId(item.id);
    setError(null);
    try {
      await decideReturn(token, item.id, action, body);
      refresh();
    } catch (caught) {
      setError(caught instanceof ReturnsError ? caught.message : tr("L'action a échoué."));
    } finally {
      setBusyId(null);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{tr("Vérification de la session…")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{tr("Connectez-vous pour accéder aux retours.")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {tr("Se connecter")}
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">{tr("Retours et SAV")}</h1>

        <NewReturnForm
          onSubmit={async (input) => {
            if (!token) return;
            await openReturn(token, input);
            refresh();
          }}
        />

        <nav className="flex flex-wrap gap-2">
          {[null, ...FILTERS].map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                filter === value ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
              }`}
            >
              {value === null ? tr("Tous") : RETURN_STATUS_LABEL[value]}
            </button>
          ))}
        </nav>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
        ) : returns.length === 0 ? (
          <p className="text-sm text-ink-soft">{tr("Aucun retour.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">{tr("RMA")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Commande")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Motif")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Demandé")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Remboursé")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Statut")}</th>
                  <th className="py-2 font-medium">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((item) => {
                  const money = (amount: number) => formatMoney({ amount, currency: item.currency });
                  return (
                    <tr key={item.id} className="border-b border-line">
                      <td className="py-3 pr-4 text-ink">{item.number}</td>
                      <td className="py-3 pr-4 text-ink-soft">{item.order_number}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {item.reason}
                        {item.decision_note ? ` — ${item.decision_note}` : ""}
                        {item.items.length > 0 ? (
                          <span className="block text-xs">
                            {item.items.map((line) => `offre ${line.offer_id} × ${line.quantity}`).join(", ")}
                            {item.restocked ? tr(" · remis en stock") : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 text-ink">{money(item.requested_amount)}</td>
                      <td className="py-3 pr-4 text-ink">
                        {item.refunded_amount !== null ? money(item.refunded_amount) : "—"}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{tr(RETURN_STATUS_LABEL[item.status])}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {availableActions(item.status).map((action) => (
                            <button
                              key={action}
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => handleAction(item, action)}
                              className={`rounded-sm border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                                action === "reject"
                                  ? "border-danger text-danger"
                                  : action === "refund"
                                    ? "border-gold text-gold"
                                    : "border-line text-ink hover:border-gold"
                              }`}
                            >
                              {tr(RETURN_ACTION_LABEL[action])}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function NewReturnForm({
  onSubmit,
}: {
  onSubmit: (input: {
    order_number: string;
    reason: string;
    amount?: number;
    items?: { offer_id: number; quantity: number }[];
  }) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [orderNumber, setOrderNumber] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [articles, setArticles] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!orderNumber || !reason) {
      setFormError("La commande et le motif sont requis.");
      return;
    }

    const items = parseReturnItems(articles);
    if (items === null) {
      setFormError("Articles invalides : saisissez des paires offre:quantité séparées par des virgules (ex. 12:2, 15).");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        order_number: orderNumber,
        reason,
        amount: amount ? Number(amount) : undefined,
        items: items.length > 0 ? items : undefined,
      });
      setOrderNumber("");
      setReason("");
      setAmount("");
      setArticles("");
    } catch (caught) {
      setFormError(caught instanceof ReturnsError ? caught.message : tr("Ouverture impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("N° commande livrée")}
        <input
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder={tr("TCH-20261025-XXXXXX")}
          className="w-52 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Motif")}
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={tr("Produit défectueux")}
          className="w-64 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Articles (offre:qté, optionnel)")}
        <input
          value={articles}
          onChange={(event) => setArticles(event.target.value)}
          placeholder="12:2, 15"
          className="w-40 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Montant (optionnel)")}
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={tr("Total de la commande")}
          className="w-40 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <Button type="submit" disabled={submitting}>
        {tr("Ouvrir le retour")}
      </Button>

      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}
