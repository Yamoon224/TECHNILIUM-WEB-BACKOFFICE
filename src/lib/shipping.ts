/**
 * Client-side access to the Shipping module's admin endpoints
 * (backend/app/Modules/Shipping/Http/Controllers). Plain `fetch`,
 * mirroring lib/vendors.ts and lib/payments.ts.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type ShipmentStatus = "pending" | "in_transit" | "delivered" | "failed_attempt" | "returned";

export interface Shipment {
  id: number;
  order_number: string;
  assigned_to: number | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string | null;
  status: ShipmentStatus;
  attempts: number;
  notes: string | null;
  delivered_at: string | null;
  created_at: string | null;
}

export class ShippingError extends Error {}

async function parseError(response: Response): Promise<ShippingError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new ShippingError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new ShippingError(`Erreur inattendue (${response.status}).`);
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

export async function listShipments(token: string, status?: ShipmentStatus): Promise<Shipment[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${API_BASE_URL}/admin/shipments${params}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  const body = (await response.json()) as { data: Shipment[] };
  return body.data;
}

export async function createShipment(token: string, orderNumber: string, assignedTo?: number): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/admin/shipments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ order_number: orderNumber, assigned_to: assignedTo }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Shipment>;
}

export async function assignShipment(token: string, id: number, assignedTo: number): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/admin/shipments/${id}/assign`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ assigned_to: assignedTo }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Shipment>;
}

async function transition(
  token: string,
  id: number,
  action: "start" | "deliver" | "retry" | "return",
): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/admin/shipments/${id}/${action}`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Shipment>;
}

export const startShipment = (token: string, id: number) => transition(token, id, "start");
export const deliverShipment = (token: string, id: number) => transition(token, id, "deliver");
export const retryShipment = (token: string, id: number) => transition(token, id, "retry");
export const returnShipment = (token: string, id: number) => transition(token, id, "return");

export async function failShipment(token: string, id: number, notes?: string): Promise<Shipment> {
  const response = await fetch(`${API_BASE_URL}/admin/shipments/${id}/fail`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Shipment>;
}
