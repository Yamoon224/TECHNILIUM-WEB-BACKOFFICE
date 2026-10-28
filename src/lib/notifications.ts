/**
 * Client-side access to the Notifications module's admin endpoints
 * (backend/app/Modules/Notifications): the journal of customer messages and
 * the manual retry of failed ones.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type NotificationStatus = "pending" | "sent" | "failed";

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  pending: "En attente",
  sent: "Envoyé",
  failed: "Échec",
};

export const NOTIFICATION_EVENT_LABEL: Record<string, string> = {
  "order.placed": "Commande enregistrée",
  "order.confirmed": "Commande confirmée",
  "order.shipped": "Commande expédiée",
  "order.delivered": "Commande livrée",
  "order.cancelled": "Commande annulée",
  "return.accepted": "Retour accepté",
  "return.received": "Colis de retour reçu",
  "return.rejected": "Retour refusé",
  "return.refunded": "Retour remboursé",
};

export const CHANNEL_LABEL: Record<string, string> = { sms: "SMS", whatsapp: "WhatsApp" };

export interface Notification {
  id: number;
  event: string;
  channel: string;
  recipient: string;
  body: string;
  reference: string | null;
  status: NotificationStatus;
  attempts: number;
  error: string | null;
  sent_at: string | null;
  created_at: string | null;
}

export class NotificationsError extends Error {}

/** Only a failed message can be sent again (mirrors NotificationController::retry). */
export function canRetry(notification: Pick<Notification, "status">): boolean {
  return notification.status === "failed";
}

export function eventLabel(event: string): string {
  return NOTIFICATION_EVENT_LABEL[event] ?? event;
}

/** Counts per status, for the summary above the table. */
export function countByStatus(list: readonly Pick<Notification, "status">[]): Record<NotificationStatus, number> {
  const counts: Record<NotificationStatus, number> = { pending: 0, sent: 0, failed: 0 };
  for (const item of list) counts[item.status] += 1;
  return counts;
}

async function parseError(response: Response): Promise<NotificationsError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new NotificationsError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new NotificationsError(`Erreur inattendue (${response.status}).`);
  }
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

export async function listNotifications(
  token: string,
  filters: { status?: NotificationStatus; reference?: string } = {},
): Promise<Notification[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (filters.status) params.set("status", filters.status);
  if (filters.reference) params.set("reference", filters.reference);

  const response = await fetch(`${API_BASE_URL}/admin/notifications?${params.toString()}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as { data: Notification[] }).data;
}

export async function retryNotification(token: string, id: number): Promise<Notification> {
  const response = await fetch(`${API_BASE_URL}/admin/notifications/${id}/retry`, {
    method: "POST",
    headers: headers(token),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Notification>;
}
