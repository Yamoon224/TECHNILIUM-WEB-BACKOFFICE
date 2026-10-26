import type { OrderStatus } from "./orderStatus";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface OrderItem {
  offer_id: number;
  product_name: string;
  brand: string;
  quantity: number;
  unit_price: { amount: number; currency: string };
  line_total: { amount: number; currency: string };
}

export interface Order {
  order_number: string;
  status: OrderStatus;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string | null;
  notes: string | null;
  subtotal: { amount: number; currency: string };
  items: OrderItem[];
  created_at: string | null;
}

export class OrdersError extends Error {}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Erreur inattendue (${response.status}).`;
  } catch {
    return `Erreur inattendue (${response.status}).`;
  }
}

export async function listOrders(token: string, status?: OrderStatus): Promise<Order[]> {
  const params = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${API_BASE_URL}/orders${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new OrdersError(await parseErrorMessage(response));
  }

  const body = (await response.json()) as { data: Order[] };
  return body.data;
}

export async function transitionOrder(token: string, orderNumber: string, status: OrderStatus): Promise<Order> {
  const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderNumber)}/transition`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new OrdersError(await parseErrorMessage(response));
  }

  return response.json() as Promise<Order>;
}
