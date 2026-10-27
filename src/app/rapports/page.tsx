"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_META, type OrderStatus } from "@/lib/orderStatus";
import { RETURN_STATUS_LABEL, type ReturnStatus } from "@/lib/returns";
import {
  ReportsError,
  barPercent,
  defaultPeriod,
  downloadSalesCsv,
  getDashboard,
  getSalesBySeller,
  isValidPeriod,
  maxRevenue,
  type Dashboard,
  type Period,
  type SellerSales,
} from "@/lib/reports";

const xof = (amount: number) => formatMoney({ amount, currency: "XOF" });

const METHOD_LABEL: Record<string, string> = { cod: "Paiement à la livraison", mobile_money: "Mobile money" };

export default function ReportsPage() {
  const router = useRouter();
  const { status: sessionStatus, token, user, logout } = useAuth();
  // "Today" is only known in the browser: reading the clock during render
  // would be frozen at build time by the prerender, so the default period is
  // set on mount.
  const [draft, setDraft] = useState<Period>({ from: "", to: "" });
  const [period, setPeriod] = useState<Period | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [sellers, setSellers] = useState<SellerSales[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const initial = defaultPeriod(new Date());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(initial);
    setPeriod(initial);
  }, []);

  useEffect(() => {
    if (!token || !period) return;
    let cancelled = false;

    Promise.all([getDashboard(token, period), getSalesBySeller(token, period)])
      .then(([dash, sellerRows]) => {
        if (cancelled) return;
        setDashboard(dash);
        setSellers(sellerRows);
        setError(null);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof ReportsError ? caught.message : "Rapports indisponibles.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, period]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleExport() {
    if (!token || !period) return;
    setExporting(true);
    try {
      await downloadSalesCsv(token, period);
    } catch (caught) {
      setError(caught instanceof ReportsError ? caught.message : "Export impossible.");
    } finally {
      setExporting(false);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder aux rapports.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} roles={user?.roles} />

      <main className="flex w-full flex-1 flex-col gap-8 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-2xl font-semibold text-ink">Rapports</h1>

          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (isValidPeriod(draft)) setPeriod(draft);
            }}
          >
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Du
              <input
                type="date"
                value={draft.from}
                onChange={(event) => setDraft({ ...draft, from: event.target.value })}
                className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Au
              <input
                type="date"
                value={draft.to}
                onChange={(event) => setDraft({ ...draft, to: event.target.value })}
                className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
              />
            </label>
            <Button type="submit" disabled={!isValidPeriod(draft)}>
              Appliquer
            </Button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="rounded-sm border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-gold disabled:opacity-50"
            >
              Exporter les ventes (CSV)
            </button>
          </form>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {!dashboard ? <p className="text-sm text-ink-soft">Chargement…</p> : <Report dashboard={dashboard} sellers={sellers} />}
      </main>
    </div>
  );
}

function Report({ dashboard, sellers }: { dashboard: Dashboard; sellers: SellerSales[] }) {
  const { sales, finance, returns, alerts } = dashboard;

  return (
    <>
      <section aria-label="Indicateurs">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Chiffre d'affaires" value={xof(sales.revenue)} />
          <Tile label="Commandes" value={String(sales.orders)} />
          <Tile label="Panier moyen" value={xof(sales.average_basket)} />
          <Tile label="Taux de retour" value={`${returns.rate_percent} %`} />
        </dl>
      </section>

      {alerts.stalled_orders > 0 || alerts.low_stock_count > 0 ? (
        <section aria-label="Alertes" className="flex flex-col gap-2 rounded-sm border border-gold-deep p-4 text-sm">
          <h2 className="font-display text-lg text-ink">Alertes</h2>
          {alerts.stalled_orders > 0 ? (
            <p className="text-ink">
              {alerts.stalled_orders} commande(s) en attente ou confirmée(s) depuis plus de quelques jours.
            </p>
          ) : null}
          {alerts.low_stock_count > 0 ? (
            <>
              <p className="text-ink">{alerts.low_stock_count} offre(s) en stock bas ou en rupture :</p>
              <ul className="text-xs text-ink-soft">
                {alerts.low_stock.map((offer) => (
                  <li key={offer.offer_id}>
                    {offer.product} ({offer.sku}) — stock : {offer.stock}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <SalesChart days={sales.by_day} />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Meilleurs produits</h2>
          {dashboard.top_products.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune vente sur la période.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {dashboard.top_products.map((product) => (
                  <tr key={product.product} className="border-b border-line">
                    <td className="py-2 pr-4 text-ink">{product.product}</td>
                    <td className="py-2 pr-4 text-right text-ink-soft">× {product.quantity}</td>
                    <td className="py-2 text-right text-ink">{xof(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Commandes par statut</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {Object.entries(dashboard.orders_by_status).map(([status, count]) => (
              <li key={status} className="flex justify-between border-b border-line py-1">
                <span className="text-ink-soft">{ORDER_STATUS_META[status as OrderStatus]?.label ?? status}</span>
                <span className="text-ink">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Finance</h2>
          <dl className="flex flex-col gap-1 text-sm">
            <Row label="Encaissé" value={xof(finance.collected)} />
            {Object.entries(finance.collected_by_method).map(([method, amount]) => (
              <Row key={method} label={`dont ${METHOD_LABEL[method] ?? method}`} value={xof(amount)} muted />
            ))}
            <Row label="Remboursé aux clients" value={xof(finance.refunded)} />
            <Row label="Commissions" value={xof(finance.commissions)} />
            <Row label="Reversé aux vendeurs" value={xof(finance.paid_to_vendors)} />
            <Row label="Restant dû aux vendeurs" value={xof(finance.owed_to_vendors)} />
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Retours</h2>
          <dl className="flex flex-col gap-1 text-sm">
            <Row label="Dossiers ouverts sur la période" value={String(returns.count)} />
            <Row label="Montant remboursé" value={xof(returns.refunded_amount)} />
            {Object.entries(returns.by_status).map(([status, count]) => (
              <Row key={status} label={RETURN_STATUS_LABEL[status as ReturnStatus] ?? status} value={String(count)} muted />
            ))}
          </dl>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Ventes par vendeur</h2>
        {sellers.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune vente sur la période.</p>
        ) : (
          <table className="w-full max-w-xl border-collapse text-sm">
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller.vendor_id ?? "own"} className="border-b border-line">
                  <td className="py-2 pr-4 text-ink">{seller.seller}</td>
                  <td className="py-2 pr-4 text-right text-ink-soft">{seller.orders} cmd</td>
                  <td className="py-2 text-right text-ink">{xof(seller.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-xs text-ink-soft">
        Montants en F CFA. Le chiffre d&apos;affaires compte les commandes non annulées, TVA comprise.
      </p>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line p-4">
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="mt-1 font-display text-xl text-ink">{value}</dd>
    </div>
  );
}

function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between border-b border-line py-1">
      <dt className={muted ? "pl-4 text-xs text-ink-soft" : "text-ink-soft"}>{label}</dt>
      <dd className={muted ? "text-xs text-ink-soft" : "text-ink"}>{value}</dd>
    </div>
  );
}

/**
 * One series (revenue per day), so no legend: the title names it. Bars are
 * thin with a rounded data end; the value is in each bar's tooltip, and an
 * equivalent table is one toggle away so the chart is never the only way in.
 */
function SalesChart({ days }: { days: { date: string; orders: number; revenue: number }[] }) {
  const [showTable, setShowTable] = useState(false);
  const max = maxRevenue(days);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">Chiffre d&apos;affaires par jour</h2>
        {days.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowTable((current) => !current)}
            className="text-xs text-gold underline-offset-4 hover:underline"
          >
            {showTable ? "Voir le graphique" : "Voir le tableau"}
          </button>
        ) : null}
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-ink-soft">Aucune vente sur la période.</p>
      ) : showTable ? (
        <table className="w-full max-w-xl border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-ink-soft">
              <th className="py-1 pr-4 font-medium">Jour</th>
              <th className="py-1 pr-4 text-right font-medium">Commandes</th>
              <th className="py-1 text-right font-medium">Chiffre d&apos;affaires</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-b border-line">
                <td className="py-1 pr-4 text-ink">{day.date}</td>
                <td className="py-1 pr-4 text-right text-ink-soft">{day.orders}</td>
                <td className="py-1 text-right text-ink">{xof(day.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-label="Chiffre d'affaires par jour" className="flex h-40 items-end gap-1 border-b border-line">
          {days.map((day) => (
            <div
              key={day.date}
              title={`${day.date} — ${xof(day.revenue)} (${day.orders} commande${day.orders > 1 ? "s" : ""})`}
              className="min-w-1 flex-1 rounded-t-[4px] bg-gold hover:bg-gold-bright"
              style={{ height: `${barPercent(day.revenue, max)}%` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
