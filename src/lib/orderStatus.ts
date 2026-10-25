/**
 * Mirrors the sub-order state machine from the cahier des charges (§3.2).
 * Kept in sync manually with backend/app/Modules/Orders/Domain/OrderStatus.php
 * until the OpenAPI-generated enum replaces it.
 */
export const ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "payment_failed",
  "paid",
  "under_review",
  "confirmed",
  "preparing",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivery_failed",
  "delivered",
  "completed",
  "return_requested",
  "refunded",
  "exchanged",
  "disputed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

interface StatusMeta {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  draft: { label: "Brouillon", tone: "neutral" },
  awaiting_payment: { label: "En attente de paiement", tone: "warning" },
  payment_failed: { label: "Paiement échoué", tone: "danger" },
  paid: { label: "Payée", tone: "info" },
  under_review: { label: "En vérification", tone: "warning" },
  confirmed: { label: "Confirmée", tone: "info" },
  preparing: { label: "En préparation", tone: "info" },
  ready_to_ship: { label: "Prête à expédier", tone: "info" },
  shipped: { label: "Expédiée", tone: "info" },
  out_for_delivery: { label: "En cours de livraison", tone: "info" },
  delivery_failed: { label: "Livraison échouée", tone: "danger" },
  delivered: { label: "Livrée", tone: "success" },
  completed: { label: "Terminée", tone: "success" },
  return_requested: { label: "Retour demandé", tone: "warning" },
  refunded: { label: "Remboursée", tone: "neutral" },
  exchanged: { label: "Échangée", tone: "neutral" },
  disputed: { label: "En litige", tone: "danger" },
  cancelled: { label: "Annulée", tone: "neutral" },
};
