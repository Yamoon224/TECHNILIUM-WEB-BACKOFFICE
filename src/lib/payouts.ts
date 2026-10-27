/**
 * Client-side access to the Payouts module's admin endpoints
 * (backend/app/Modules/Payouts/Http/Controllers). Plain `fetch`,
 * mirroring lib/invoicing.ts.
 */

import type { CurrencyCode } from "./money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type PayoutStatus = "pending" | "paid";

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  pending: "À payer",
  paid: "Payé",
};

export interface PayoutItem {
  order_number: string;
  gross_amount: number;
  commission_amount: number;
  /** Withheld for refunded returns; gross_amount is already net of it. */
  refund_deduction_amount: number;
}

export interface Payout {
  id: number;
  vendor_id: number;
  vendor_name: string;
  status: PayoutStatus;
  currency: CurrencyCode;
  commission_rate_percent: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string | null;
  items: PayoutItem[] | null;
}

export class PayoutsError extends Error {}

/** Mirrors the backend invariant: net = gross - commission (cahier §12.1). */
export function netOf(payout: Pick<Payout, "gross_amount" | "commission_amount">): number {
  return payout.gross_amount - payout.commission_amount;
}

/** Total still owed to vendors: the sum of pending payouts' net amounts. */
export function totalOwed(payouts: readonly Payout[]): number {
  return payouts.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.net_amount, 0);
}

async function parseError(response: Response): Promise<PayoutsError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new PayoutsError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new PayoutsError(`Erreur inattendue (${response.status}).`);
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

export async function listPayouts(token: string, filters: { status?: PayoutStatus } = {}): Promise<Payout[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (filters.status) params.set("status", filters.status);

  const response = await fetch(`${API_BASE_URL}/admin/payouts?${params.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  const body = (await response.json()) as { data: Payout[] };
  return body.data;
}

export async function getPayout(token: string, id: number): Promise<Payout> {
  const response = await fetch(`${API_BASE_URL}/admin/payouts/${id}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Payout>;
}

export async function calculatePayout(token: string, vendorId: number): Promise<Payout> {
  const response = await fetch(`${API_BASE_URL}/admin/payouts`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ vendor_id: vendorId }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Payout>;
}

export async function markPayoutPaid(token: string, id: number, paymentReference: string): Promise<Payout> {
  const response = await fetch(`${API_BASE_URL}/admin/payouts/${id}/pay`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ payment_reference: paymentReference }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Payout>;
}
