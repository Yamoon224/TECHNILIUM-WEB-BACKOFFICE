"use client";

import { useAppearance } from "@/components/AppearanceProvider";
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import { formatMoney } from "@/lib/money";
import { parseOptionalAmount } from "@/lib/input";
import {
  PO_STATUS_LABEL,
  ProcurementError,
  addLandedCost,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  createSupplierInvoice,
  getPayables,
  getPurchaseOrder,
  getStockValuation,
  isValidReceipt,
  linesTotal,
  listPurchaseOrders,
  listSupplierInvoices,
  listSuppliers,
  parseOrderLines,
  paySupplierInvoice,
  placePurchaseOrder,
  purchaseActions,
  receivableLines,
  receiveGoods,
  setSupplierActive,
  type Payables,
  type PurchaseOrder,
  type StockValuation,
  type Supplier,
  type SupplierInvoice,
} from "@/lib/procurement";

type Tab = "orders" | "suppliers" | "invoices" | "stock";

const TABS: { id: Tab; label: string }[] = [
  { id: "orders", label: "Bons de commande" },
  { id: "suppliers", label: "Fournisseurs" },
  { id: "invoices", label: "Factures et dettes" },
  { id: "stock", label: "Stock valorisé" },
];

const xof = (amount: number) => formatMoney({ amount, currency: "XOF" });
const field = "rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink";
const small =
  "rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:opacity-50";

export default function ProcurementPage() {
  const { tr } = useAppearance();
  const router = useRouter();
  const { status: sessionStatus, token, user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");

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
        <p className="text-ink-soft">{tr("Connectez-vous pour accéder aux achats.")}</p>
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
        <h1 className="font-display text-2xl font-semibold text-ink">{tr("Achats")}</h1>

        <nav className="flex flex-wrap gap-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                tab === id ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === "orders" ? <OrdersTab token={token} /> : null}
        {tab === "suppliers" ? <SuppliersTab token={token} /> : null}
        {tab === "invoices" ? <InvoicesTab token={token} /> : null}
        {tab === "stock" ? <StockTab token={token} /> : null}
      </main>
    </div>
  );
}

/** Loads on mount, and on demand through reload(). */
function useLoader<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    load()
      .then(setData)
      .catch((caught) => setError(caught instanceof ProcurementError ? caught.message : "Données indisponibles."));
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return { data, error, reload, setError };
}

function Notice({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-danger">{error}</p> : null;
}

/* -------------------------------- Orders -------------------------------- */

function OrdersTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const orders = useLoader<PurchaseOrder[]>(useCallback(() => listPurchaseOrders(token), [token]));
  const suppliers = useLoader<Supplier[]>(useCallback(() => listSuppliers(token), [token]));
  const [open, setOpen] = useState<PurchaseOrder | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<PurchaseOrder | void>) {
    setBusy(true);
    orders.setError(null);
    try {
      await action();
      orders.reload();
      if (open) setOpen(await getPurchaseOrder(token, open.id));
    } catch (caught) {
      orders.setError(caught instanceof ProcurementError ? caught.message : "L'action a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(order: PurchaseOrder) {
    if (open?.id === order.id) return setOpen(null);
    try {
      setOpen(await getPurchaseOrder(token, order.id));
    } catch (caught) {
      orders.setError(caught instanceof ProcurementError ? caught.message : "Bon indisponible.");
    }
  }

  function addCost(order: PurchaseOrder) {
    const label = window.prompt("Nature du frais (transport, douane, manutention…) :");
    if (!label?.trim()) return;
    const amount = parseOptionalAmount(window.prompt("Montant (F CFA) :") ?? "");
    if (!amount) return orders.setError("Montant invalide : saisissez un entier positif.");
    void run(() => addLandedCost(token, order.id, label.trim(), amount));
  }

  return (
    <section className="flex flex-col gap-4">
      <NewOrderForm
        suppliers={(suppliers.data ?? []).filter((s) => s.active)}
        onSubmit={async (input) => {
          await createPurchaseOrder(token, input);
          orders.reload();
        }}
      />

      <Notice error={orders.error} />

      {!orders.data ? (
        <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
      ) : orders.data.length === 0 ? (
        <p className="text-sm text-ink-soft">{tr("Aucun bon de commande.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">{tr("Bon")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Fournisseur")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Marchandises")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Frais d'approche")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Statut")}</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <Fragment key={order.id}>
                  <tr className="cursor-pointer border-b border-line hover:bg-surface" onClick={() => toggle(order)}>
                    <td className="py-3 pr-4 text-ink">{order.number}</td>
                    <td className="py-3 pr-4 text-ink-soft">{order.supplier_name}</td>
                    <td className="py-3 pr-4 text-ink">{xof(order.goods_total ?? 0)}</td>
                    <td className="py-3 pr-4 text-ink-soft">{xof(order.landed_total ?? 0)}</td>
                    <td className="py-3 pr-4 text-ink-soft">{tr(PO_STATUS_LABEL[order.status])}</td>
                    <td className="py-3 text-xs text-ink-soft">{tr("Détail")}</td>
                  </tr>
                  {open?.id === order.id ? (
                    <tr className="border-b border-line bg-surface">
                      <td colSpan={6} className="px-3 py-4">
                        <OrderDetail
                          order={open}
                          busy={busy}
                          onPlace={() => run(() => placePurchaseOrder(token, open.id))}
                          onCancel={() => window.confirm(`Annuler ${open.number} ?`) && run(() => cancelPurchaseOrder(token, open.id))}
                          onLanded={() => addCost(open)}
                          onReceive={(lines) => run(() => receiveGoods(token, open.id, lines))}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function OrderDetail({
  order,
  busy,
  onPlace,
  onCancel,
  onLanded,
  onReceive,
}: {
  order: PurchaseOrder;
  busy: boolean;
  onPlace: () => void;
  onCancel: () => void;
  onLanded: () => void;
  onReceive: (lines: { line_id: number; accepted: number; rejected: number }[]) => void;
}) {
  const { tr } = useAppearance();
  const actions = purchaseActions(order.status);
  const [receipt, setReceipt] = useState<Record<number, { accepted: string; rejected: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const toReceive = receivableLines(order);

  function submitReceipt() {
    setError(null);
    const rows: { line_id: number; accepted: number; rejected: number }[] = [];

    for (const line of toReceive) {
      const entry = receipt[line.id];
      const accepted = Number(entry?.accepted || 0);
      const rejected = Number(entry?.rejected || 0);
      if (accepted === 0 && rejected === 0) continue;

      if (!isValidReceipt(accepted, rejected, line.outstanding)) {
        return setError(`${line.description} : quantités invalides (reste à recevoir : ${line.outstanding}).`);
      }
      rows.push({ line_id: line.id, accepted, rejected });
    }

    if (rows.length === 0) return setError("Saisissez au moins une quantité acceptée ou refusée.");
    onReceive(rows);
    setReceipt({});
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {actions.includes("place") ? (
          <button type="button" disabled={busy} onClick={onPlace} className={small}>
            {tr("Envoyer au fournisseur")}
          </button>
        ) : null}
        {actions.includes("landed") ? (
          <button type="button" disabled={busy} onClick={onLanded} className={small}>
            {tr("Ajouter un frais d'approche")}
          </button>
        ) : null}
        {actions.includes("cancel") ? (
          <button type="button" disabled={busy} onClick={onCancel} className="rounded-sm border border-danger px-2 py-1 text-xs text-danger disabled:opacity-50">
            {tr("Annuler")}
          </button>
        ) : null}
      </div>

      <table className="w-full max-w-3xl border-collapse text-xs">
        <thead>
          <tr className="border-b border-line text-left text-ink-soft">
            <th className="py-1 pr-3 font-medium">{tr("Article")}</th>
            <th className="py-1 pr-3 text-right font-medium">{tr("Coût unit.")}</th>
            <th className="py-1 pr-3 text-right font-medium">{tr("Commandé")}</th>
            <th className="py-1 pr-3 text-right font-medium">{tr("Reçu")}</th>
            <th className="py-1 pr-3 text-right font-medium">{tr("Refusé")}</th>
            <th className="py-1 text-right font-medium">{tr("Reste")}</th>
          </tr>
        </thead>
        <tbody>
          {(order.lines ?? []).map((line) => (
            <tr key={line.id} className="border-b border-line text-ink-soft">
              <td className="py-1 pr-3 text-ink">{line.description}</td>
              <td className="py-1 pr-3 text-right">{xof(line.unit_cost_amount)}</td>
              <td className="py-1 pr-3 text-right">{line.quantity_ordered}</td>
              <td className="py-1 pr-3 text-right">{line.quantity_received}</td>
              <td className="py-1 pr-3 text-right">{line.quantity_rejected}</td>
              <td className="py-1 text-right text-ink">{line.outstanding}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(order.landed_costs ?? []).length > 0 ? (
        <p className="text-xs text-ink-soft">
          {tr("Frais d'approche :")} {(order.landed_costs ?? []).map((cost) => `${cost.label} ${xof(cost.amount)}`).join(" · ")}
        </p>
      ) : null}

      {actions.includes("receive") && toReceive.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-sm border border-line p-3">
          <p className="text-sm text-ink">{tr("Réception : contrôlez chaque ligne (acceptée = entre en stock, refusée = retour fournisseur).")}</p>
          {toReceive.map((line) => (
            <div key={line.id} className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
              <span className="w-64 text-ink">{line.description}</span>
              <label className="flex items-center gap-1">
                {tr("Acceptées")}
                <input
                  inputMode="numeric"
                  value={receipt[line.id]?.accepted ?? ""}
                  onChange={(e) => setReceipt({ ...receipt, [line.id]: { rejected: receipt[line.id]?.rejected ?? "", accepted: e.target.value } })}
                  className={`${field} w-20`}
                />
              </label>
              <label className="flex items-center gap-1">
                {tr("Refusées")}
                <input
                  inputMode="numeric"
                  value={receipt[line.id]?.rejected ?? ""}
                  onChange={(e) => setReceipt({ ...receipt, [line.id]: { accepted: receipt[line.id]?.accepted ?? "", rejected: e.target.value } })}
                  className={`${field} w-20`}
                />
              </label>
              <span>{tr("reste")} {line.outstanding}</span>
            </div>
          ))}
          <Notice error={error} />
          <button type="button" disabled={busy} onClick={submitReceipt} className="self-start rounded-sm border border-gold px-3 py-1.5 text-sm text-gold disabled:opacity-50">
            {tr("Enregistrer la réception")}
          </button>
        </div>
      ) : null}

      {(order.receipts ?? []).length > 0 ? (
        <p className="text-xs text-ink-soft">
          {(order.receipts ?? []).length} {tr("réception(s) :")} {xof((order.receipts ?? []).reduce((sum, r) => sum + r.goods_amount, 0))} {tr("de marchandises,")}{" "}
          {xof((order.receipts ?? []).reduce((sum, r) => sum + r.landed_amount, 0))} {tr("de frais imputés au stock.")}
        </p>
      ) : null}
    </div>
  );
}

function NewOrderForm({
  suppliers,
  onSubmit,
}: {
  suppliers: Supplier[];
  onSubmit: (input: { supplier_id: number; lines: { offer_id: number; quantity: number; unit_cost_amount: number }[]; expected_at?: string }) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState("");
  const [expected, setExpected] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = parseOrderLines(lines);
  const total = parsed ? linesTotal(parsed) : 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!supplierId) return setError("Choisissez un fournisseur.");
    if (!parsed || parsed.length === 0) {
      return setError("Lignes invalides : saisissez offre:quantité:coût unitaire, séparés par des virgules (ex. 12:10:5000, 15:4:20000). Une offre une seule fois.");
    }

    setSubmitting(true);
    try {
      await onSubmit({ supplier_id: Number(supplierId), lines: parsed, expected_at: expected || undefined });
      setLines("");
      setExpected("");
    } catch (caught) {
      setError(caught instanceof ProcurementError ? caught.message : tr("Création impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Fournisseur")}
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${field} min-w-52`}>
          <option value="">{tr("Choisir…")}</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Lignes (offre:quantité:coût unitaire)")}
        <input value={lines} onChange={(e) => setLines(e.target.value)} placeholder="12:10:5000, 15:4:20000" className={`${field} w-72`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Livraison attendue")}
        <input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className={field} />
      </label>
      <Button type="submit" disabled={submitting}>
        {tr("Créer le bon")}{total > 0 ? ` (${xof(total)})` : ""}
      </Button>
      <p className="w-full text-xs text-ink-soft">{tr("Seul le stock propre de Technilium peut être acheté. Le bon est créé en brouillon.")}</p>
      {error ? <p className="w-full text-sm text-danger">{error}</p> : null}
    </form>
  );
}

/* ------------------------------- Suppliers ------------------------------- */

function SuppliersTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const { data, error, reload, setError } = useLoader<Supplier[]>(useCallback(() => listSuppliers(token), [token]));
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState("30");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const days = parseOptionalAmount(terms === "0" ? "" : terms);
    if (!name.trim() || days === null) return setFormError("Un nom et des conditions de paiement valides (jours) sont requis.");

    try {
      await createSupplier(token, { name: name.trim(), contact_name: contact || null, phone: phone || null, payment_terms_days: days ?? 0 });
      setName("");
      setContact("");
      setPhone("");
      reload();
    } catch (caught) {
      setFormError(caught instanceof ProcurementError ? caught.message : tr("Création impossible."));
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          {tr("Nom")}
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} w-56`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          {tr("Contact")}
          <input value={contact} onChange={(e) => setContact(e.target.value)} className={`${field} w-44`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          {tr("Téléphone")}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${field} w-36`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          {tr("Paiement à (jours)")}
          <input value={terms} onChange={(e) => setTerms(e.target.value)} inputMode="numeric" className={`${field} w-24`} />
        </label>
        <Button type="submit">{tr("Ajouter")}</Button>
        {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
      </form>

      <Notice error={error} />

      {!data ? (
        <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-ink-soft">{tr("Aucun fournisseur.")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line border-y border-line text-sm">
          {data.map((supplier) => (
            <li key={supplier.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex flex-col">
                <span className={supplier.active ? "text-ink" : "text-ink-soft line-through"}>{supplier.name}</span>
                <span className="text-xs text-ink-soft">
                  {supplier.contact_name ?? "—"} · {supplier.phone ?? "—"} {tr("· paiement à")} {supplier.payment_terms_days} j
                </span>
              </span>
              <button
                type="button"
                className={small}
                onClick={() =>
                  setSupplierActive(token, supplier.id, !supplier.active)
                    .then(reload)
                    .catch((caught) => setError(caught instanceof ProcurementError ? caught.message : tr("Action impossible.")))
                }
              >
                {supplier.active ? tr("Désactiver") : tr("Réactiver")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------- Invoices ------------------------------- */

function InvoicesTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const [filter, setFilter] = useState<"open" | "overdue" | "settled" | undefined>("open");
  const invoices = useLoader<SupplierInvoice[]>(useCallback(() => listSupplierInvoices(token, filter), [token, filter]));
  const payables = useLoader<Payables>(useCallback(() => getPayables(token), [token]));
  const suppliers = useLoader<Supplier[]>(useCallback(() => listSuppliers(token), [token]));

  function refreshAll() {
    invoices.reload();
    payables.reload();
  }

  function pay(invoice: SupplierInvoice) {
    const raw = window.prompt(`Montant à régler sur ${invoice.number} (reste ${invoice.outstanding}). Laisser vide pour tout régler :`);
    if (raw === null) return;
    const amount = parseOptionalAmount(raw);
    if (amount === null) return invoices.setError("Montant invalide : saisissez un entier positif.");

    const method = window.prompt("Moyen (bank_transfer, mobile_money, cash, cheque) :", "bank_transfer");
    if (!method) return;

    paySupplierInvoice(token, invoice.id, method.trim(), amount)
      .then(refreshAll)
      .catch((caught) => invoices.setError(caught instanceof ProcurementError ? caught.message : "Règlement impossible."));
  }

  return (
    <section className="flex flex-col gap-4">
      {payables.data ? (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-sm border border-line p-4">
            <dt className="text-xs text-ink-soft">{tr("Dû aux fournisseurs")}</dt>
            <dd className="mt-1 font-display text-xl text-ink">{xof(payables.data.total_outstanding)}</dd>
          </div>
          <div className="rounded-sm border border-line p-4">
            <dt className="text-xs text-ink-soft">{tr("Dont échu")}</dt>
            <dd className={`mt-1 font-display text-xl ${payables.data.total_overdue > 0 ? "text-danger" : "text-ink"}`}>
              {xof(payables.data.total_overdue)}
            </dd>
          </div>
        </dl>
      ) : null}

      <NewInvoiceForm suppliers={suppliers.data ?? []} onSubmit={async (input) => { await createSupplierInvoice(token, input); refreshAll(); }} />

      <nav className="flex flex-wrap gap-2">
        {([["open", "Ouvertes"], ["overdue", "En retard"], ["settled", "Soldées"], [undefined, "Toutes"]] as const).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              filter === value ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <Notice error={invoices.error} />

      {!invoices.data ? (
        <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
      ) : invoices.data.length === 0 ? (
        <p className="text-sm text-ink-soft">{tr("Aucune facture.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">{tr("Facture")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Fournisseur")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Montant")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Reste dû")}</th>
                <th className="py-2 pr-4 font-medium">{tr("Échéance")}</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {invoices.data.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">
                    {invoice.number}
                    {invoice.kind === "landed_cost" ? <span className="block text-xs text-ink-soft">{tr("frais d'approche")}</span> : null}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{invoice.supplier_name}</td>
                  <td className="py-3 pr-4 text-ink-soft">{xof(invoice.amount)}</td>
                  <td className="py-3 pr-4 text-ink">{xof(invoice.outstanding)}</td>
                  <td className={`py-3 pr-4 ${invoice.overdue ? "text-danger" : "text-ink-soft"}`}>
                    {invoice.due_date}
                    {invoice.overdue ? tr(" · en retard") : ""}
                  </td>
                  <td className="py-3">
                    {!invoice.settled ? (
                      <button type="button" className={small} onClick={() => pay(invoice)}>
                        {tr("Régler")}
                      </button>
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

function NewInvoiceForm({
  suppliers,
  onSubmit,
}: {
  suppliers: Supplier[];
  onSubmit: (input: { supplier_id: number; number: string; kind: "goods" | "landed_cost"; amount: number; invoice_date: string }) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [supplierId, setSupplierId] = useState("");
  const [number, setNumber] = useState("");
  const [kind, setKind] = useState<"goods" | "landed_cost">("goods");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const value = parseOptionalAmount(amount);
    if (!supplierId || !number.trim() || !date || !value) return setError("Fournisseur, numéro, date et montant (entier positif) sont requis.");

    try {
      await onSubmit({ supplier_id: Number(supplierId), number: number.trim(), kind, amount: value, invoice_date: date });
      setNumber("");
      setAmount("");
    } catch (caught) {
      setError(caught instanceof ProcurementError ? caught.message : tr("Enregistrement impossible."));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Fournisseur")}
        <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={`${field} min-w-48`}>
          <option value="">{tr("Choisir…")}</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("N° de facture")}
        <input value={number} onChange={(e) => setNumber(e.target.value)} className={`${field} w-36`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Nature")}
        <select value={kind} onChange={(e) => setKind(e.target.value as "goods" | "landed_cost")} className={field}>
          <option value="goods">{tr("Marchandises")}</option>
          <option value="landed_cost">{tr("Frais d'approche")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Montant")}
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={`${field} w-32`} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Date")}
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </label>
      <Button type="submit">{tr("Enregistrer")}</Button>
      <p className="w-full text-xs text-ink-soft">{tr("L'échéance se calcule avec les conditions de paiement du fournisseur.")}</p>
      {error ? <p className="w-full text-sm text-danger">{error}</p> : null}
    </form>
  );
}

/* --------------------------------- Stock --------------------------------- */

function StockTab({ token }: { token: string }) {
  const { tr } = useAppearance();
  const { data, error } = useLoader<StockValuation>(useCallback(() => getStockValuation(token), [token]));

  if (!data) return error ? <Notice error={error} /> : <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>;

  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        {tr("Valeur du stock acheté, au coût moyen pondéré (frais d'approche inclus) :")}{" "}
        <span className="text-ink">{xof(data.total_value)}</span>
      </p>

      {data.offers.length === 0 ? (
        <p className="text-sm text-ink-soft">{tr("Aucun achat réceptionné pour l'instant.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="py-2 pr-4 font-medium">{tr("Produit")}</th>
                <th className="py-2 pr-4 font-medium">{tr("SKU")}</th>
                <th className="py-2 pr-4 text-right font-medium">{tr("Stock")}</th>
                <th className="py-2 pr-4 text-right font-medium">{tr("Coût moyen")}</th>
                <th className="py-2 text-right font-medium">{tr("Valeur")}</th>
              </tr>
            </thead>
            <tbody>
              {data.offers.map((offer) => (
                <tr key={offer.offer_id} className="border-b border-line">
                  <td className="py-3 pr-4 text-ink">{offer.product}</td>
                  <td className="py-3 pr-4 text-ink-soft">{offer.sku ?? "—"}</td>
                  <td className="py-3 pr-4 text-right text-ink-soft">{offer.stock}</td>
                  <td className="py-3 pr-4 text-right text-ink-soft">{xof(offer.average_cost)}</td>
                  <td className="py-3 text-right text-ink">{xof(offer.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
