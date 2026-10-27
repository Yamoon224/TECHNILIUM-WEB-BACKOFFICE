/**
 * Client-side access to the Returns module's admin endpoints
 * (backend/app/Modules/Returns/Http/Controllers). Mirrors lib/payouts.ts.
 */

import type { CurrencyCode } from "./money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type ReturnStatus = "requested" | "accepted" | "received" | "refunded" | "rejected";
export type ReturnAction = "accept" | "receive" | "refund" | "reject";

export const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  requested: "Demandé",
  accepted: "Accepté",
  received: "Reçu",
  refunded: "Remboursé",
  rejected: "Refusé",
};

export const RETURN_ACTION_LABEL: Record<ReturnAction, string> = {
  accept: "Accepter",
  receive: "Colis reçu",
  refund: "Rembourser",
  reject: "Refuser",
};

/**
 * Mirrors ReturnStatus::allowedTransitions() on the backend — the UI only
 * offers legal actions, the server remains the authority.
 */
const TRANSITIONS: Record<ReturnStatus, ReturnAction[]> = {
  requested: ["accept", "reject"],
  accepted: ["receive"],
  received: ["refund", "reject"],
  refunded: [],
  rejected: [],
};

export function availableActions(status: ReturnStatus): ReturnAction[] {
  return TRANSITIONS[status];
}

export interface ReturnRequest {
  id: number;
  number: string;
  order_number: string;
  status: ReturnStatus;
  reason: string;
  decision_note: string | null;
  currency: CurrencyCode;
  requested_amount: number;
  refunded_amount: number | null;
  refunded_at: string | null;
  created_at: string | null;
}

export class ReturnsError extends Error {}

async function parseError(response: Response): Promise<ReturnsError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new ReturnsError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new ReturnsError(`Erreur inattendue (${response.status}).`);
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

export async function listReturns(token: string, filters: { status?: ReturnStatus } = {}): Promise<ReturnRequest[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (filters.status) params.set("status", filters.status);

  const response = await fetch(`${API_BASE_URL}/admin/returns?${params.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  const body = (await response.json()) as { data: ReturnRequest[] };
  return body.data;
}

export async function openReturn(
  token: string,
  input: { order_number: string; reason: string; amount?: number },
): Promise<ReturnRequest> {
  const response = await fetch(`${API_BASE_URL}/admin/returns`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<ReturnRequest>;
}

export async function decideReturn(
  token: string,
  id: number,
  action: ReturnAction,
  body: { note?: string; amount?: number } = {},
): Promise<ReturnRequest> {
  const response = await fetch(`${API_BASE_URL}/admin/returns/${id}/${action}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<ReturnRequest>;
}
