/**
 * Procurement (backend Procurement module): suppliers, purchase orders with
 * receipts and landed costs, supplier invoices and payables, stock valuation.
 * All amounts are XOF minor units.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export class ProcurementError extends Error {}

export type PurchaseOrderStatus = "draft" | "ordered" | "partially_received" | "received" | "cancelled";

export const PO_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Brouillon",
  ordered: "Commandé",
  partially_received: "Reçu en partie",
  received: "Reçu",
  cancelled: "Annulé",
};

export interface Supplier {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms_days: number;
  lead_time_days: number | null;
  notes: string | null;
  active: boolean;
}

export interface PurchaseOrderLine {
  id: number;
  offer_id: number;
  description: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_rejected: number;
  outstanding: number;
  unit_cost_amount: number;
}

export interface PurchaseOrder {
  id: number;
  number: string;
  supplier_id: number;
  supplier_name: string | null;
  status: PurchaseOrderStatus;
  expected_at: string | null;
  goods_total: number | null;
  landed_total: number | null;
  lines?: PurchaseOrderLine[];
  landed_costs?: { id: number; label: string; amount: number }[];
  receipts?: { id: number; goods_amount: number; landed_amount: number; created_at: string | null }[];
}

export interface SupplierInvoice {
  id: number;
  supplier_id: number;
  supplier_name: string | null;
  number: string;
  kind: "goods" | "landed_cost";
  amount: number;
  paid_amount: number;
  outstanding: number;
  settled: boolean;
  overdue: boolean;
  invoice_date: string;
  due_date: string;
}

export interface Payables {
  total_outstanding: number;
  total_overdue: number;
  by_supplier: { supplier_id: number; supplier_name: string; outstanding: number; overdue: number; invoices: number }[];
}

export interface StockValuation {
  total_value: number;
  offers: { offer_id: number; product: string; sku: string | null; stock: number; average_cost: number; value: number }[];
}

export type PurchaseAction = "place" | "cancel" | "receive" | "landed";

/**
 * What can be done to an order in a given status. Mirrors the backend rules:
 * a draft is sent or cancelled; goods are received once sent; cancelling is
 * only possible before anything was received; a landed cost can be added
 * until the order is fully received.
 */
export function purchaseActions(status: PurchaseOrderStatus): PurchaseAction[] {
  switch (status) {
    case "draft":
      return ["place", "cancel"];
    case "ordered":
      return ["receive", "landed", "cancel"];
    case "partially_received":
      return ["receive", "landed"];
    default:
      return [];
  }
}

export function receivableLines(order: Pick<PurchaseOrder, "lines">): PurchaseOrderLine[] {
  return (order.lines ?? []).filter((line) => line.outstanding > 0);
}

export interface NewLine {
  offer_id: number;
  quantity: number;
  unit_cost_amount: number;
}

/**
 * Parses "12:10:5000, 15:4:20000" (offre:quantité:coût unitaire) into order
 * lines. A blank text is an empty list; anything malformed, a zero quantity
 * or a repeated offer is null — the caller must not send it.
 */
export function parseOrderLines(raw: string): NewLine[] | null {
  const text = raw.trim();
  if (text === "") return [];

  const lines: NewLine[] = [];
  const seen = new Set<number>();

  for (const part of text.split(",")) {
    const match = /^\s*(\d+)\s*:\s*(\d+)\s*:\s*(\d+)\s*$/.exec(part);
    if (!match) return null;

    const line = { offer_id: Number(match[1]), quantity: Number(match[2]), unit_cost_amount: Number(match[3]) };
    if (line.offer_id < 1 || line.quantity < 1 || seen.has(line.offer_id)) return null;

    seen.add(line.offer_id);
    lines.push(line);
  }

  return lines;
}

/** Value of everything on an order line list, for the draft preview. */
export function linesTotal(lines: readonly NewLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unit_cost_amount, 0);
}

/**
 * What a receipt row may contain: whole non-negative numbers whose sum does not
 * exceed what is still outstanding on the line. (The server checks it again.)
 */
export function isValidReceipt(accepted: number, rejected: number, outstanding: number): boolean {
  return (
    Number.isInteger(accepted) &&
    Number.isInteger(rejected) &&
    accepted >= 0 &&
    rejected >= 0 &&
    accepted + rejected > 0 &&
    accepted + rejected <= outstanding
  );
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin${path}`, { ...init, headers: headers(token), cache: "no-store" });

  if (!response.ok) {
    let message = `Erreur inattendue (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
      message = (body.errors ? Object.values(body.errors)[0]?.[0] : undefined) ?? body.message ?? message;
    } catch {
      // keep the generic message
    }
    throw new ProcurementError(message);
  }

  return (await response.json()) as T;
}

const page = <T>(token: string, path: string) => request<{ data: T[] }>(token, path).then((body) => body.data);
const post = <T>(token: string, path: string, body: unknown = {}) =>
  request<T>(token, path, { method: "POST", body: JSON.stringify(body) });

export const listSuppliers = (token: string) => page<Supplier>(token, "/suppliers?per_page=100");
export const createSupplier = (token: string, input: Partial<Supplier> & { name: string }) => post<Supplier>(token, "/suppliers", input);
export const setSupplierActive = (token: string, id: number, active: boolean) =>
  request<Supplier>(token, `/suppliers/${id}`, { method: "PATCH", body: JSON.stringify({ active }) });

export const listPurchaseOrders = (token: string) => page<PurchaseOrder>(token, "/purchase-orders?per_page=100");
export const getPurchaseOrder = (token: string, id: number) => request<PurchaseOrder>(token, `/purchase-orders/${id}`);
export const createPurchaseOrder = (token: string, input: { supplier_id: number; lines: NewLine[]; expected_at?: string; notes?: string }) =>
  post<PurchaseOrder>(token, "/purchase-orders", input);
export const placePurchaseOrder = (token: string, id: number) => post<PurchaseOrder>(token, `/purchase-orders/${id}/place`);
export const cancelPurchaseOrder = (token: string, id: number) => post<PurchaseOrder>(token, `/purchase-orders/${id}/cancel`);
export const addLandedCost = (token: string, id: number, label: string, amount: number) =>
  post<PurchaseOrder>(token, `/purchase-orders/${id}/landed-costs`, { label, amount });
export const receiveGoods = (
  token: string,
  id: number,
  lines: { line_id: number; accepted: number; rejected: number }[],
  notes?: string,
) => post<PurchaseOrder>(token, `/purchase-orders/${id}/receipts`, { lines, notes });

export const listSupplierInvoices = (token: string, status?: "open" | "settled" | "overdue") =>
  page<SupplierInvoice>(token, `/supplier-invoices?per_page=100${status ? `&status=${status}` : ""}`);
export const createSupplierInvoice = (
  token: string,
  input: { supplier_id: number; number: string; kind: "goods" | "landed_cost"; amount: number; invoice_date: string; due_date?: string; purchase_order_id?: number },
) => post<SupplierInvoice>(token, "/supplier-invoices", input);
export const paySupplierInvoice = (token: string, id: number, method: string, amount?: number, reference?: string) =>
  post<SupplierInvoice>(token, `/supplier-invoices/${id}/payments`, { method, amount, reference });

export const getPayables = (token: string) => request<Payables>(token, "/procurement/payables");
export const getStockValuation = (token: string) => request<StockValuation>(token, "/procurement/stock-valuation");
