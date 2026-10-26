"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BackofficeNav } from "@/components/BackofficeNav";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/lib/useAuth";
import { listOrders, transitionOrder, OrdersError, type Order } from "@/lib/orders";
import { ORDER_STATUSES, ORDER_STATUS_META, ORDER_STATUS_TRANSITIONS, type OrderStatus } from "@/lib/orderStatus";

const ACTION_LABEL: Record<OrderStatus, string> = {
  pending: "Repasser en attente",
  confirmed: "Confirmer",
  shipped: "Expédier",
  delivered: "Marquer livrée",
  cancelled: "Annuler",
};

export default function OrdersPage() {
  const { status: sessionStatus, token } = useAuth();
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
      .catch((caught) => setError(caught instanceof OrdersError ? caught.message : "Commandes indisponibles."))
      .finally(() => setLoading(false));
  }, [token, filter]);

  useEffect(() => {
    // Fetching on mount/filter change and flagging loading state
    // synchronously before the request starts is the standard pattern here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleTransition(orderNumber: string, target: OrderStatus) {
    if (!token) return;

    setPendingOrderNumber(orderNumber);
    try {
      const updated = await transitionOrder(token, orderNumber, target);
      setOrders((current) => current.map((order) => (order.order_number === orderNumber ? updated : order)));
    } catch (caught) {
      setError(caught instanceof OrdersError ? caught.message : "La mise à jour a échoué.");
    } finally {
      setPendingOrderNumber(null);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder aux commandes.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BackofficeNav onLogout={() => undefined} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Commandes</h1>

        <nav className="flex flex-wrap gap-2">
          <FilterPill active={filter === null} onClick={() => setFilter(null)}>
            Toutes
          </FilterPill>
          {ORDER_STATUSES.map((value) => (
            <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
              {ORDER_STATUS_META[value].label}
            </FilterPill>
          ))}
        </nav>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune commande.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Commande</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 font-medium">Téléphone</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.order_number} className="border-b border-line">
                    <td className="py-3 pr-4 text-ink">{order.order_number}</td>
                    <td className="py-3 pr-4 text-ink">{order.customer_name}</td>
                    <td className="py-3 pr-4 text-ink-soft">{order.customer_phone}</td>
                    <td className="py-3 pr-4 text-ink">
                      {order.subtotal.amount.toLocaleString("fr-FR")} {order.subtotal.currency}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {ORDER_STATUS_TRANSITIONS[order.status].map((target) => (
                          <button
                            key={target}
                            type="button"
                            disabled={pendingOrderNumber === order.order_number}
                            onClick={() => handleTransition(order.order_number, target)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {ACTION_LABEL[target]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        active ? "border-gold bg-gold text-bg font-medium" : "border-line text-ink hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}
