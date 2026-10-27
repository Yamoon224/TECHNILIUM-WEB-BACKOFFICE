/**
 * Client-side access to the vendor space (`/vendors/me/*`, backend
 * Vendors module). Every call is scoped by the API to the authenticated
 * vendor; no vendor id is ever sent from here.
 */

import type { CurrencyCode } from "./money";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class VendorSpaceError extends Error {}

export type OfferStatus = "draft" | "pending_review" | "published" | "rejected" | "archived";

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  draft: "Brouillon",
  pending_review: "En modération",
  published: "Publiée",
  rejected: "Refusée",
  archived: "Archivée",
};

export interface VendorSummary {
  company_name: string;
  orders_by_status: Record<string, number>;
  offers_by_status: Record<string, number>;
  payout_pending_amount: number;
  payout_paid_amount: number;
}

export interface VendorOrderLine {
  description: string;
  quantity: number;
  unit_price_amount: number;
  line_total_amount: number;
}

export interface VendorOrder {
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string | null;
  currency: CurrencyCode;
  /** The vendor's share only, not the whole multi-vendor order. */
  vendor_subtotal_amount: number;
  delivered_at: string | null;
  lines: VendorOrderLine[];
}

export interface VendorPayoutItem {
  order_number: string;
  gross_amount: number;
  commission_amount: number;
  refund_deduction_amount: number;
}

export interface VendorPayout {
  id: number;
  status: "pending" | "paid";
  currency: CurrencyCode;
  commission_rate_percent: number;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string | null;
  items: VendorPayoutItem[] | null;
}

export interface VendorOffer {
  id: number;
  variant_id: number;
  product_name: string;
  brand: string;
  sku: string;
  price_amount: number;
  currency: CurrencyCode;
  stock_quantity: number;
  warranty_months: number;
  status: OfferStatus;
}

/** Total number of orders across all statuses, for the dashboard. */
export function totalCount(byStatus: Record<string, number>): number {
  return Object.values(byStatus).reduce((sum, count) => sum + count, 0);
}

/** An offer with no stock is not sellable even when published. */
export function isOutOfStock(offer: Pick<VendorOffer, "stock_quantity">): boolean {
  return offer.stock_quantity <= 0;
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/vendors/me${path}`, {
    ...init,
    headers: headers(token),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Erreur inattendue (${response.status}).`;
    try {
      message = ((await response.json()) as { message?: string }).message ?? message;
    } catch {
      // keep the generic message
    }
    throw new VendorSpaceError(message);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const getSummary = (token: string) => request<VendorSummary>(token, "/summary");

export const listOrders = (token: string) =>
  request<{ data: VendorOrder[] }>(token, "/orders").then((body) => body.data);

export const listPayouts = (token: string) =>
  request<{ data: VendorPayout[] }>(token, "/payouts").then((body) => body.data);

export const getPayout = (token: string, id: number) => request<VendorPayout>(token, `/payouts/${id}`);

export const listOffers = (token: string) =>
  request<{ data: VendorOffer[] }>(token, "/offers").then((body) => body.data);

export const createOffer = (
  token: string,
  input: { variant_id: number; price_amount: number; stock_quantity: number; warranty_months?: number },
) => request<VendorOffer>(token, "/offers", { method: "POST", body: JSON.stringify(input) });

export const updateOffer = (
  token: string,
  id: number,
  input: { price_amount?: number; stock_quantity?: number; warranty_months?: number },
) => request<VendorOffer>(token, `/offers/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const archiveOffer = (token: string, id: number) =>
  request<void>(token, `/offers/${id}`, { method: "DELETE" });
