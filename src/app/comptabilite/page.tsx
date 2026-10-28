"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { useAuth } from "@/lib/useAuth";
import {
  AccountingError,
  JOURNAL_LABEL,
  entryTotals,
  getTrialBalance,
  isTrialBalanced,
  listEntries,
  type JournalEntry,
  type TrialBalance,
} from "@/lib/accounting";

const fmt = (amount: number) => amount.toLocaleString("fr-FR");

export default function AccountingPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [balance, setBalance] = useState<TrialBalance | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [journal, setJournal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getTrialBalance(token)
      .then(setBalance)
      .catch((caught) => setError(caught instanceof AccountingError ? caught.message : "Balance indisponible."));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    listEntries(token, { journal: journal ?? undefined })
      .then(setEntries)
      .catch((caught) => setError(caught instanceof AccountingError ? caught.message : "Écritures indisponibles."));
  }, [token, journal]);

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
        <p className="text-ink-soft">Connectez-vous pour accéder à la comptabilité.</p>
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
        <h1 className="font-display text-2xl font-semibold text-ink">Comptabilité</h1>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Balance générale</h2>
          {balance ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-soft">
                    <th className="py-2 pr-4 font-medium">Compte</th>
                    <th className="py-2 pr-4 font-medium">Libellé</th>
                    <th className="py-2 pr-4 text-right font-medium">Débit</th>
                    <th className="py-2 pr-4 text-right font-medium">Crédit</th>
                    <th className="py-2 text-right font-medium">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {balance.accounts.map((account) => (
                    <tr key={account.code} className="border-b border-line">
                      <td className="py-2 pr-4 text-ink">{account.code}</td>
                      <td className="py-2 pr-4 text-ink-soft">{account.name}</td>
                      <td className="py-2 pr-4 text-right text-ink">{fmt(account.debit)}</td>
                      <td className="py-2 pr-4 text-right text-ink">{fmt(account.credit)}</td>
                      <td className="py-2 text-right text-ink">{fmt(account.balance)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="py-2 pr-4 text-ink" colSpan={2}>
                      Total {isTrialBalanced(balance) ? "" : "— DÉSÉQUILIBRÉ"}
                    </td>
                    <td className="py-2 pr-4 text-right text-ink">{fmt(balance.total_debit)}</td>
                    <td className="py-2 pr-4 text-right text-ink">{fmt(balance.total_credit)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Chargement…</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Écritures</h2>
          <nav className="flex flex-wrap gap-2">
            {[null, ...Object.keys(JOURNAL_LABEL)].map((code) => (
              <button
                key={code ?? "all"}
                type="button"
                onClick={() => setJournal(code)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  journal === code ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
                }`}
              >
                {code === null ? "Tous les journaux" : JOURNAL_LABEL[code]}
              </button>
            ))}
          </nav>

          {entries.length === 0 ? (
            <p className="text-sm text-ink-soft">Aucune écriture.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => {
                const totals = entryTotals(entry);
                return (
                  <li key={entry.id} className="rounded-sm border border-line p-3 text-sm">
                    <div className="flex flex-wrap justify-between gap-2 text-ink">
                      <span>
                        {entry.entry_date} · {JOURNAL_LABEL[entry.journal] ?? entry.journal} · {entry.description}
                      </span>
                      <span className="text-ink-soft">{entry.reference}</span>
                    </div>
                    <table className="mt-2 w-full text-xs">
                      <tbody>
                        {entry.lines.map((line, index) => (
                          <tr key={index} className="text-ink-soft">
                            <td className="py-0.5 pr-4">{line.account}</td>
                            <td className="py-0.5 pr-4 text-right">{line.debit ? fmt(line.debit) : ""}</td>
                            <td className="py-0.5 text-right">{line.credit ? fmt(line.credit) : ""}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-line text-ink">
                          <td className="py-0.5 pr-4">Total</td>
                          <td className="py-0.5 pr-4 text-right">{fmt(totals.debit)}</td>
                          <td className="py-0.5 text-right">{fmt(totals.credit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
