/**
 * Mirrors backend/app/Modules/Orders/Domain/OrderStatus.php — a deliberately
 * simplified first pass (paiement à la livraison only), not the full 18-state
 * machine from the cahier des charges §3.2. Extend both sides together when
 * Payments/Shipping/Returns land, don't widen this file alone.
 */
export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

interface StatusMeta {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: { label: "En attente", tone: "warning" },
  confirmed: { label: "Confirmée", tone: "info" },
  shipped: { label: "Expédiée", tone: "info" },
  delivered: { label: "Livrée", tone: "success" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

/** Mirrors OrderStatus::allowedTransitions() on the backend. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
