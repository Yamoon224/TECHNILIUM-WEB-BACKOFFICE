/**
 * The support desk (backend Customers module, `/admin/tickets`): the queue,
 * the conversation with internal notes, and status / priority / assignment.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type TicketStatus = "open" | "pending_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "À traiter",
  pending_customer: "Attente client",
  resolved: "Résolu",
  closed: "Clos",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: "Basse", normal: "Normale", high: "Haute" };

export const CATEGORY_LABEL: Record<string, string> = {
  order: "Commande",
  payment: "Paiement",
  delivery: "Livraison",
  product: "Produit",
  warranty: "Garantie / SAV",
  other: "Autre",
};

export interface TicketMessage {
  id: number;
  from: "customer" | "staff";
  author_id: number;
  body: string;
  internal: boolean;
  created_at: string | null;
}

export interface Ticket {
  id: number;
  number: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  order_number: string | null;
  customer_id: number;
  assigned_to: number | null;
  overdue: boolean;
  first_responded_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  messages?: TicketMessage[];
}

export interface StatusAction {
  target: TicketStatus;
  label: string;
}

/**
 * The status moves the desk can make from a given status. Mirrors
 * TicketStatus::allowedTransitions() on the backend, minus the moves the
 * conversation does by itself (a reply sets "attente client" / "à traiter").
 */
export function statusActions(status: TicketStatus): StatusAction[] {
  switch (status) {
    case "open":
    case "pending_customer":
      return [{ target: "resolved", label: "Marquer résolu" }];
    case "resolved":
      return [
        { target: "open", label: "Rouvrir" },
        { target: "closed", label: "Clore" },
      ];
    case "closed":
      return [];
  }
}

/** A closed ticket accepts no message, from either side. */
export function canReply(status: TicketStatus): boolean {
  return status !== "closed";
}

/** Tickets the team still has to act on. */
export function countOpen(tickets: readonly Pick<Ticket, "status">[]): number {
  return tickets.filter((ticket) => ticket.status === "open").length;
}

export class SupportError extends Error {}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

async function parseError(response: Response): Promise<SupportError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new SupportError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new SupportError(`Erreur inattendue (${response.status}).`);
  }
}

export interface TicketFilters {
  status?: TicketStatus;
  assigned?: "me" | "none";
  overdue?: boolean;
  q?: string;
}

export async function listTickets(token: string, filters: TicketFilters = {}): Promise<Ticket[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (filters.status) params.set("status", filters.status);
  if (filters.assigned) params.set("assigned", filters.assigned);
  if (filters.overdue) params.set("overdue", "1");
  if (filters.q?.trim()) params.set("q", filters.q.trim());

  const response = await fetch(`${API_BASE_URL}/admin/tickets?${params.toString()}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as { data: Ticket[] }).data;
}

export async function getTicket(token: string, id: number): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/admin/tickets/${id}`, { headers: headers(token), cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Ticket>;
}

export async function replyToTicket(token: string, id: number, body: string, internal: boolean): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/admin/tickets/${id}/messages`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ body, internal }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Ticket>;
}

export async function updateTicket(
  token: string,
  id: number,
  changes: { status?: TicketStatus; priority?: TicketPriority; assigned_to_me?: boolean },
): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/admin/tickets/${id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(changes),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Ticket>;
}
