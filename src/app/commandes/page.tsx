"use client";

import { QrLink } from "@/components/QrLink";
import { DataTable } from "@/components/DataTable";
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppearance } from "@/components/AppearanceProvider";
import { BackofficeNav } from "@/components/BackofficeNav";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/useAuth";
import {
  OrdersError,
  hasSplit,
  listOrders,
  sellerLabel,
  transitionOrder,
  transitionSubOrder,
  type Order,
  historyLine,
} from "@/lib/orders";
import { ORDER_STATUSES, ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/lib/orderStatus";

/** Marker for "could not load the list": the message is translated at render time. */
const LIST_FAILED = "list-failed";

export default function OrdersPage() {
  const router = useRouter();
  const { t } = useAppearance();
  const { status: sessionStatus, token, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listOrders(token, filter ?? undefined)
      .then(setOrders)
      .catch((caught) => setError(caught instanceof OrdersError ? caught.message : LIST_FAILED))
      .finally(() => setLoading(false));
  }, [token, filter]);

  useEffect(() => {
    // Fetching on mount/filter change and flagging loading state
    // synchronously before the request starts is the standard pattern here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleTransition(orderNumber: string, target: OrderStatus) {
    if (!token) return;

    setPendingOrderNumber(orderNumber);
    try {
      const updated = await transitionOrder(token, orderNumber, target);
      setOrders((current) => current.map((order) => (order.order_number === orderNumber ? updated : order)));
    } catch (caught) {
      setError(caught instanceof OrdersError ? caught.message : "");
    } finally {
      setPendingOrderNumber(null);
    }
  }

  async function handleSubOrderTransition(orderNumber: string, subOrderId: number, target: OrderStatus) {
    if (!token) return;

    setPendingOrderNumber(orderNumber);
    try {
      const updated = await transitionSubOrder(token, orderNumber, subOrderId, target);
      setOrders((current) => current.map((order) => (order.order_number === orderNumber ? updated : order)));
    } catch (caught) {
      setError(caught instanceof OrdersError ? caught.message : "");
    } finally {
      setPendingOrderNumber(null);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{t("login.checking")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{t("orders.signIn")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {t("login.submit")}
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="page-title font-display text-2xl font-semibold text-ink">{t("orders.title")}</h1>

        <nav className="flex flex-wrap gap-2">
          <FilterPill active={filter === null} onClick={() => setFilter(null)}>
            {t("orders.all")}
          </FilterPill>
          {ORDER_STATUSES.map((value) => (
            <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
              {t(`status.${value}`)}
            </FilterPill>
          ))}
        </nav>

        {error !== null ? <p className="text-sm text-danger">{error === LIST_FAILED ? t("orders.unavailable") : error || t("orders.updateFailed")}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">{t("orders.loading")}</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-ink-soft">{t("orders.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
            <DataTable
  name="commandes"
  rows={orders}
  headers={[t("orders.colOrder"), t("orders.colCustomer"), t("orders.colPhone"), t("orders.colTotal"), t("orders.colStatus"), t("orders.colAction")]}
  actionColumns={[5]}
  renderRow={(order) => (
                  <Fragment key={order.order_number}>
                  <tr className="border-b border-line">
                    <td className="py-3 pr-4 text-ink">{order.order_number}</td>
                    <td className="py-3 pr-4 text-ink">{order.customer_name}</td>
                    <td className="py-3 pr-4 text-ink-soft">{order.customer_phone}</td>
                    <td className="py-3 pr-4 text-ink">
                      {order.subtotal.amount.toLocaleString("fr-FR")} {order.subtotal.currency}
                      {order.discount && order.discount.amount > 0 ? (
                        <span className="block text-xs text-ink-soft">
                          {t("orders.discount")} {order.discount.amount.toLocaleString("fr-FR")}
                          {order.coupon_code ? ` (${order.coupon_code})` : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={order.status} />
                      {order.partial ? <span className="ml-2 text-xs text-ink-soft">{t("orders.partial")}</span> : null}
                      {order.status_history?.length ? (
                        <span className="mt-1 block text-xs text-ink-soft">{historyLine(order.status_history)}</span>
                      ) : null}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <QrLink kind="order" reference={order.order_number} />
                        {ORDER_STATUS_TRANSITIONS[order.status].map((target) => (
                          <button
                            key={target}
                            type="button"
                            disabled={pendingOrderNumber === order.order_number}
                            onClick={() => handleTransition(order.order_number, target)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t(`action.${target}`)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {hasSplit(order)
                    ? order.sub_orders?.map((subOrder) => (
                        <tr key={subOrder.id} className="border-b border-line bg-surface">
                          <td className="py-2 pl-6 pr-4 text-xs text-ink-soft" colSpan={3}>
                            {sellerLabel(subOrder)}
                          </td>
                          <td className="py-2 pr-4 text-xs text-ink-soft">
                            {subOrder.subtotal.amount.toLocaleString("fr-FR")} {subOrder.subtotal.currency}
                          </td>
                          <td className="py-2 pr-4">
                            <StatusBadge status={subOrder.status} />
                          </td>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-2">
                              {ORDER_STATUS_TRANSITIONS[subOrder.status].map((target) => (
                                <button
                                  key={target}
                                  type="button"
                                  disabled={pendingOrderNumber === order.order_number}
                                  onClick={() => handleSubOrderTransition(order.order_number, subOrder.id, target)}
                                  className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {t(`action.${target}`)}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                  </Fragment>
                )}
/>
          </div>
        )}
      </main>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}
