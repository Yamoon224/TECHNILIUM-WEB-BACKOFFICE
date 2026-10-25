import { ORDER_STATUS_META, type OrderStatus } from "../lib/orderStatus";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-surface-raised text-ink-soft",
  info: "bg-sky-950 text-sky-300",
  success: "bg-emerald-950 text-emerald-300",
  warning: "bg-amber-950 text-gold-bright",
  danger: "bg-red-950 text-red-300",
};

export interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[meta.tone]}`}
    >
      {meta.label}
    </span>
  );
}
