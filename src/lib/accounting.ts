/**
 * Client-side access to the Accounting module's read-only ledger endpoints
 * (backend/app/Modules/Accounting/Http/Controllers).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface JournalEntryLine {
  account: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: number;
  journal: string;
  entry_date: string;
  description: string;
  reference: string | null;
  currency: string;
  lines: JournalEntryLine[];
}

export interface TrialBalanceAccount {
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface TrialBalance {
  accounts: TrialBalanceAccount[];
  total_debit: number;
  total_credit: number;
}

export const JOURNAL_LABEL: Record<string, string> = {
  VT: "Ventes",
  CA: "Caisse",
  MM: "Mobile money",
};

export class AccountingError extends Error {}

/** The ledger invariant (cahier §12.1): total debit = total credit. */
export function isTrialBalanced(balance: TrialBalance): boolean {
  return balance.total_debit === balance.total_credit;
}

export function entryTotals(entry: JournalEntry): { debit: number; credit: number } {
  return entry.lines.reduce(
    (totals, line) => ({ debit: totals.debit + line.debit, credit: totals.credit + line.credit }),
    { debit: 0, credit: 0 },
  );
}

async function get<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    let message = `Erreur inattendue (${response.status}).`;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      // keep the generic message
    }
    throw new AccountingError(message);
  }
  return response.json() as Promise<T>;
}

export async function listEntries(token: string, filters: { journal?: string } = {}): Promise<JournalEntry[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (filters.journal) params.set("journal", filters.journal);
  const body = await get<{ data: JournalEntry[] }>(token, `/admin/accounting/entries?${params.toString()}`);
  return body.data;
}

export function getTrialBalance(token: string): Promise<TrialBalance> {
  return get<TrialBalance>(token, "/admin/accounting/trial-balance");
}
