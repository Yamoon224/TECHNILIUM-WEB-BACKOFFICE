import { ORDER_STATUS_META, type OrderStatus } from "../lib/orderStatus";
import { useAppearance } from "./AppearanceProvider";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-surface-raised text-ink-soft",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-gold-bright",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export interface StatusBadgeProps {
  status: OrderStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useAppearance();
  const meta = ORDER_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[meta.tone]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
