"use client";

import { useAppearance } from "@/components/AppearanceProvider";
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/orderStatus";
import {
  OFFER_STATUS_LABEL,
  VendorSpaceError,
  archiveOffer,
  canShip,
  createOffer,
  getPayout,
  getSummary,
  isOutOfStock,
  listOffers,
  listOrders,
  listPayouts,
  shipOrder,
  totalCount,
  updateOffer,
  type VendorOffer,
  type VendorOrder,
  type VendorPayout,
  type VendorSummary,
} from "@/lib/vendorSpace";

type Tab = "summary" | "orders" | "payouts" | "offers";

const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Synthèse" },
  { id: "orders", label: "Commandes" },
  { id: "payouts", label: "Reversements" },
  { id: "offers", label: "Mes offres" },
];

const xof = (amount: number) => formatMoney({ amount, currency: "XOF" });

export default function VendorSpacePage() {
  const { tr } = useAppearance();
  const router = useRouter();
  const { status: sessionStatus, token, user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("summary");

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{tr("Vérification de la session…")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{tr("Connectez-vous pour accéder à votre espace vendeur.")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {tr("Se connecter")}
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} roles={user?.roles} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">{tr("Espace vendeur")}</h1>

        <nav className="flex flex-wrap gap-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                tab === id
                  ? "border-gold bg-gold text-on-primary font-medium"
                  : "border-line text-ink hover:border-gold"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "summary" ? <SummaryTab token={token} /> : null}
        {tab === "orders" ? <OrdersTab token={token} /> : null}
        {tab === "payouts" ? <PayoutsTab token={token} /> : null}
        {tab === "offers" ? <OffersTab token={token} /> : null}
      </main>
    </div>
  );
}

/** Loads data once per mount and exposes loading/error/reload for a tab. */
function useLoader<T>(load: () => Promise<T>) {
  const { tr } = useAppearance();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    load()
      .then(setData)
      .catch((caught) => setError(caught instanceof VendorSpaceError ? caught.message : tr("Données indisponibles.")));
  }, [load, tr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { data, error, reload, setError };
}

function Status({ error, loading }: { error: string | null; loading: boolean }) {
  const { tr } = useAppearance();
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (loading) return <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>;
  return null;
}

function SummaryTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const { data, error } = useLoader<VendorSummary>(useCallback(() => getSummary(token), [token]));

  if (!data) return <Status error={error} loading />;

  return (
    <section className="flex flex-col gap-4">
      <p className="text-ink-soft">{data.company_name}</p>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={tr("Commandes")} value={String(totalCount(data.orders_by_status))} />
        <Stat label={tr("Offres")} value={String(totalCount(data.offers_by_status))} />
        <Stat label={tr("À recevoir")} value={xof(data.payout_pending_amount)} />
        <Stat label={tr("Déjà reversé")} value={xof(data.payout_paid_amount)} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line p-4 bg-surface shadow-card border-b-4 border-b-gold">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-xl text-ink">{value}</dd>
    </div>
  );
}

function OrdersTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const { data, error, reload, setError } = useLoader<VendorOrder[]>(useCallback(() => listOrders(token), [token]));
  const [busy, setBusy] = useState<string | null>(null);

  async function handleShip(orderNumber: string) {
    setBusy(orderNumber);
    setError(null);
    try {
      await shipOrder(token, orderNumber);
      reload();
    } catch (caught) {
      setError(caught instanceof VendorSpaceError ? caught.message : tr("Expédition impossible."));
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <Status error={error} loading />;
  if (data.length === 0) return <p className="text-sm text-ink-soft">{tr("Aucune commande.")}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {data.map((order) => (
        <li key={order.order_number} className="rounded-sm border border-line p-4 text-sm bg-surface shadow-card border-b-4 border-b-gold">
          <div className="flex flex-wrap justify-between gap-2 text-ink">
            <span>{order.order_number}</span>
            <span className="text-ink-soft">
              {tr(ORDER_STATUS_META[order.status as OrderStatus]?.label ?? order.status)}
            </span>
          </div>
          <p className="mt-1 text-ink-soft">
            {order.customer_name} · {order.customer_phone} · {order.delivery_address}
            {order.delivery_city ? `, ${order.delivery_city}` : ""}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-soft">
            {order.lines.map((line, index) => (
              <li key={index} className="flex justify-between gap-4">
                <span>
                  {line.quantity} × {line.description}
                </span>
                <span>{formatMoney({ amount: line.line_total_amount, currency: order.currency })}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {canShip(order) ? (
              <button
                type="button"
                disabled={busy === order.order_number}
                onClick={() => handleShip(order.order_number)}
                className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
              >
                {tr("Marquer expédié")}
              </button>
            ) : (
              <span />
            )}
            <p className="text-ink">
              {tr("Votre part :")} {formatMoney({ amount: order.vendor_subtotal_amount, currency: order.currency })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PayoutsTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const { data, error, setError } = useLoader<VendorPayout[]>(useCallback(() => listPayouts(token), [token]));
  const [detail, setDetail] = useState<VendorPayout | null>(null);

  async function toggle(payout: VendorPayout) {
    if (detail?.id === payout.id) {
      setDetail(null);
      return;
    }
    try {
      setDetail(await getPayout(token, payout.id));
    } catch (caught) {
      setError(caught instanceof VendorSpaceError ? caught.message : tr("Relevé indisponible."));
    }
  }

  if (!data) return <Status error={error} loading />;
  if (data.length === 0) return <p className="text-sm text-ink-soft">{tr("Aucun reversement pour le moment.")}</p>;

  return (
    <div className="overflow-x-auto rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
      {error ? <p className="mb-2 text-sm text-danger">{error}</p> : null}
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-soft">
            <th className="py-2 pr-4 font-medium">{tr("Date")}</th>
            <th className="py-2 pr-4 font-medium">{tr("Ventes")}</th>
            <th className="py-2 pr-4 font-medium">{tr("Commission")}</th>
            <th className="py-2 pr-4 font-medium">{tr("Net")}</th>
            <th className="py-2 pr-4 font-medium">{tr("Statut")}</th>
            <th className="py-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {data.map((payout) => {
            const money = (amount: number) => formatMoney({ amount, currency: payout.currency });
            return (
              <Fragment key={payout.id}>
                <tr className="border-b border-line">
                  <td className="py-3 pr-4 text-ink-soft">{payout.created_at?.slice(0, 10)}</td>
                  <td className="py-3 pr-4 text-ink-soft">{money(payout.gross_amount)}</td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {money(payout.commission_amount)} ({payout.commission_rate_percent} %)
                  </td>
                  <td className="py-3 pr-4 text-ink">{money(payout.net_amount)}</td>
                  <td className="py-3 pr-4 text-ink-soft">
                    {payout.status === "paid"
                      ? `${tr("Payé")}${payout.payment_reference ? ` · ${payout.payment_reference}` : ""}`
                      : tr("En cours")}
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => toggle(payout)}
                      className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                    >
                      {tr("Relevé")}
                    </button>
                  </td>
                </tr>
                {detail?.id === payout.id && detail.items ? (
                  <tr className="border-b border-line bg-surface">
                    <td colSpan={6} className="px-3 py-3">
                      <ul className="flex flex-col gap-1 text-xs text-ink-soft">
                        {detail.items.map((item) => (
                          <li key={item.order_number} className="flex justify-between gap-4">
                            <span>{item.order_number}</span>
                            <span>
                              {item.refund_deduction_amount > 0
                                ? `retours −${money(item.refund_deduction_amount)} · `
                                : ""}
                              {money(item.gross_amount)} − {money(item.commission_amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OffersTab({ token }: { token: string }) {
  const { tr, trf } = useAppearance();
  const { data, error, reload, setError } = useLoader<VendorOffer[]>(useCallback(() => listOffers(token), [token]));
  const [busyId, setBusyId] = useState<number | null>(null);

  async function run(id: number | null, action: () => Promise<unknown>, fallback: string) {
    setBusyId(id);
    setError(null);
    try {
      await action();
      reload();
    } catch (caught) {
      setError(caught instanceof VendorSpaceError ? caught.message : fallback);
    } finally {
      setBusyId(null);
    }
  }

  function editPrice(offer: VendorOffer) {
    const input = window.prompt(
      trf("Nouveau prix pour {name} (une modification renvoie l'offre en modération)", { name: offer.product_name }),
      String(offer.price_amount),
    );
    if (input === null || input.trim() === "") return;
    void run(offer.id, () => updateOffer(token, offer.id, { price_amount: Number(input) }), tr("Mise à jour impossible."));
  }

  function editStock(offer: VendorOffer) {
    const input = window.prompt(trf("Nouveau stock pour {name}", { name: offer.product_name }), String(offer.stock_quantity));
    if (input === null || input.trim() === "") return;
    void run(
      offer.id,
      () => updateOffer(token, offer.id, { stock_quantity: Number(input) }),
      tr("Mise à jour impossible."),
    );
  }

  function archive(offer: VendorOffer) {
    if (!window.confirm(`Retirer l'offre ${offer.product_name} ?`)) return;
    void run(offer.id, () => archiveOffer(token, offer.id), tr("Retrait impossible."));
  }

  return (
    <section className="flex flex-col gap-4">
      <NewOfferForm
        onSubmit={async (input) => {
          await createOffer(token, input);
          reload();
        }}
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {!data ? (
        <Status error={null} loading />
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-soft">{tr("Aucune offre.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">{tr("Produit")}</th>
                <th className="py-2 pr-4 font-medium">{tr("SKU")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Prix")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Stock")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Statut")}</th>
                <th className="py-2 font-medium">{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((offer) => (
                <tr key={offer.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">
                    {offer.brand} {offer.product_name}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{offer.sku}</td>
                  <td className="py-3 pr-4 text-ink">
                    {formatMoney({ amount: offer.price_amount, currency: offer.currency })}
                  </td>
                  <td className={`py-3 pr-4 ${isOutOfStock(offer) ? "text-danger" : "text-ink"}`}>
                    {offer.stock_quantity}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{tr(OFFER_STATUS_LABEL[offer.status])}</td>
                  <td className="py-3">
                    {offer.status !== "archived" ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          ["Prix", () => editPrice(offer)],
                          ["Stock", () => editStock(offer)],
                          ["Retirer", () => archive(offer)],
                        ].map(([label, handler]) => (
                          <button
                            key={label as string}
                            type="button"
                            disabled={busyId === offer.id}
                            onClick={handler as () => void}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:opacity-50"
                          >
                            {label as string}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function NewOfferForm({
  onSubmit,
}: {
  onSubmit: (input: {
    variant_id: number;
    price_amount: number;
    stock_quantity: number;
    warranty_months?: number;
  }) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [variantId, setVariantId] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [warranty, setWarranty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!variantId || !price || !stock) {
      setFormError(tr("La variante, le prix et le stock sont requis."));
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        variant_id: Number(variantId),
        price_amount: Number(price),
        stock_quantity: Number(stock),
        warranty_months: warranty ? Number(warranty) : undefined,
      });
      setVariantId("");
      setPrice("");
      setStock("");
      setWarranty("");
    } catch (caught) {
      setFormError(caught instanceof VendorSpaceError ? caught.message : tr("Soumission impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  const field = "w-32 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4 bg-surface shadow-card border-b-4 border-b-gold"
    >
      <label className="field">
        <input
          placeholder=" "
          type="number"
          min={1}
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className={field}
        />
        <span className="field-label">{tr("ID variante produit")}</span>
      </label>
      <label className="field">
        <input
          placeholder=" "
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={field}
        />
        <span className="field-label">{tr("Prix (F CFA)")}</span>
      </label>
      <label className="field">
        <input
          placeholder=" "
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={field}
        />
        <span className="field-label">{tr("Stock")}</span>
      </label>
      <label className="field">
        <input
          placeholder=" "
          type="number"
          min={0}
          value={warranty}
          onChange={(e) => setWarranty(e.target.value)}
          className={field}
        />
        <span className="field-label">{tr("Garantie (mois)")}</span>
      </label>
      <Button type="submit" disabled={submitting}>
        {tr("Soumettre l'offre")}
      </Button>
      <p className="w-full text-xs text-ink-soft">
        {tr(
          "L'offre part en modération avant publication. Seuls les produits déjà publiés par Technilium sont proposables.",
        )}
      </p>
      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}
