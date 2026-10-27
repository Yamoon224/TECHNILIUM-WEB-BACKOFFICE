/**
 * Client-side access to the Reporting module (`/admin/reports/*`, backend
 * Reporting module). Read-only; all amounts are XOF minor units.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ReportsError extends Error {}

export interface SalesDay {
  date: string;
  orders: number;
  revenue: number;
}

export interface Dashboard {
  currency: string;
  period: { from: string; to: string };
  sales: { revenue: number; orders: number; average_basket: number; by_day: SalesDay[] };
  orders_by_status: Record<string, number>;
  top_products: { product: string; quantity: number; revenue: number }[];
  finance: {
    collected: number;
    collected_by_method: Record<string, number>;
    refunded: number;
    commissions: number;
    paid_to_vendors: number;
    owed_to_vendors: number;
  };
  returns: { by_status: Record<string, number>; count: number; rate_percent: number; refunded_amount: number };
  alerts: {
    stalled_orders: number;
    low_stock_count: number;
    low_stock: { offer_id: number; product: string; sku: string; stock: number }[];
  };
}

export interface SellerSales {
  vendor_id: number | null;
  seller: string;
  orders: number;
  revenue: number;
}

export interface Period {
  from: string;
  to: string;
}

/** Local calendar date as YYYY-MM-DD (not UTC: a report day is the user's day). */
export function toDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The last 30 days ending today, matching the API default. */
export function defaultPeriod(today: Date): Period {
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return { from: toDateInput(from), to: toDateInput(today) };
}

/** A period is usable when both ends are set and not inverted. */
export function isValidPeriod(period: Period): boolean {
  return period.from !== "" && period.to !== "" && period.from <= period.to;
}

/** Bar length as a percentage of the largest value; 0 when there is nothing to scale. */
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(2, Math.round((value * 100) / max));
}

export function maxRevenue(days: readonly SalesDay[]): number {
  return days.reduce((max, day) => Math.max(max, day.revenue), 0);
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

async function parseError(response: Response): Promise<ReportsError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new ReportsError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new ReportsError(`Erreur inattendue (${response.status}).`);
  }
}

function query(period: Period): string {
  return new URLSearchParams({ from: period.from, to: period.to }).toString();
}

export async function getDashboard(token: string, period: Period): Promise<Dashboard> {
  const response = await fetch(`${API_BASE_URL}/admin/reports/dashboard?${query(period)}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Dashboard>;
}

export async function getSalesBySeller(token: string, period: Period): Promise<SellerSales[]> {
  const response = await fetch(`${API_BASE_URL}/admin/reports/sales-by-seller?${query(period)}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as { data: SellerSales[] }).data;
}

/** The CSV needs the bearer token, so it is fetched and saved as a blob rather than linked. */
export async function downloadSalesCsv(token: string, period: Period): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/reports/sales.csv?${query(period)}`, {
    headers: headers(token),
  });
  if (!response.ok) throw await parseError(response);

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `ventes-${period.from}-${period.to}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
