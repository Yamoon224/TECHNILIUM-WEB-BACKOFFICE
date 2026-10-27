"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import {
  INVOICE_TYPE_LABEL,
  InvoicingError,
  isCreditable,
  issueCreditNote,
  issueInvoice,
  listInvoices,
  type Invoice,
} from "@/lib/invoicing";
import { formatMoney } from "@/lib/money";

export default function InvoicesPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listInvoices(token)
      .then(setInvoices)
      .catch((caught) => setError(caught instanceof InvoicingError ? caught.message : "Factures indisponibles."))
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

  async function handleCredit(invoice: Invoice) {
    if (!token) return;
    const reason = window.prompt(`Motif de l'avoir pour ${invoice.number} ?`);
    if (!reason) return;

    setPendingId(invoice.id);
    setError(null);
    try {
      await issueCreditNote(token, invoice.id, reason);
      refresh();
    } catch (caught) {
      setError(caught instanceof InvoicingError ? caught.message : "L'avoir n'a pas pu être émis.");
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
        <p className="text-ink-soft">Connectez-vous pour accéder aux factures.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Factures et avoirs</h1>

        <NewInvoiceForm
          onSubmit={async (orderNumber) => {
            if (!token) return;
            await issueInvoice(token, orderNumber);
            refresh();
          }}
        />

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun document.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Numéro</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Commande</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">HT</th>
                  <th className="py-2 pr-4 font-medium">TVA</th>
                  <th className="py-2 pr-4 font-medium">TTC</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const money = (amount: number) => formatMoney({ amount, currency: invoice.currency });
                  return (
                    <tr key={invoice.id} className="border-b border-line">
                      <td className="py-3 pr-4 text-ink">{invoice.number}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {INVOICE_TYPE_LABEL[invoice.type]}
                        {invoice.reason ? ` — ${invoice.reason}` : ""}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{invoice.order_number}</td>
                      <td className="py-3 pr-4 text-ink-soft">{invoice.customer_name}</td>
                      <td className="py-3 pr-4 text-ink">{money(invoice.net_amount)}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {money(invoice.vat_amount)} ({invoice.vat_rate_percent} %)
                      </td>
                      <td className="py-3 pr-4 text-ink">
                        {money(invoice.total_amount)}
                        {invoice.discount_amount > 0 ? (
                          <span className="block text-xs text-ink-soft">
                            remise {money(invoice.discount_amount)}
                            {invoice.coupon_code ? ` (${invoice.coupon_code})` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3">
                        {isCreditable(invoice, invoices) ? (
                          <button
                            type="button"
                            disabled={pendingId === invoice.id}
                            onClick={() => handleCredit(invoice)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:opacity-50"
                          >
                            Émettre un avoir
                          </button>
                        ) : null}
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

function NewInvoiceForm({ onSubmit }: { onSubmit: (orderNumber: string) => Promise<void> }) {
  const [orderNumber, setOrderNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!orderNumber) {
      setFormError("Le numéro de commande est requis.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(orderNumber);
      setOrderNumber("");
    } catch (caught) {
      setFormError(caught instanceof InvoicingError ? caught.message : "Émission impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        N° commande à facturer
        <input
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder="TCH-20261025-XXXXXX"
          className="w-56 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <Button type="submit" disabled={submitting}>
        Émettre la facture
      </Button>

      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}
