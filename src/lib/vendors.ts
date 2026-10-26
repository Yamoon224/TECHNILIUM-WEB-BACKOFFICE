/**
 * Client-side access to the Vendors module's admin endpoints
 * (backend/app/Modules/Vendors/Http/Controllers/Admin). Plain `fetch`,
 * mirroring lib/catalog.ts and lib/orders.ts.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type VendorStatus = "pending" | "active" | "suspended";

export interface Vendor {
  id: number;
  company_name: string;
  phone: string;
  address: string | null;
  status: VendorStatus;
  created_at: string | null;
}

export class VendorsError extends Error {}

async function parseError(response: Response): Promise<VendorsError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new VendorsError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new VendorsError(`Erreur inattendue (${response.status}).`);
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

export async function listVendors(token: string, status?: VendorStatus): Promise<Vendor[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${API_BASE_URL}/admin/vendors${params}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Vendor[]>;
}

async function transition(token: string, id: number, action: "approve" | "suspend" | "reactivate"): Promise<Vendor> {
  const response = await fetch(`${API_BASE_URL}/admin/vendors/${id}/${action}`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Vendor>;
}

export const approveVendor = (token: string, id: number) => transition(token, id, "approve");
export const suspendVendor = (token: string, id: number) => transition(token, id, "suspend");
export const reactivateVendor = (token: string, id: number) => transition(token, id, "reactivate");
