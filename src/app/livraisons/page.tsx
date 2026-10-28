"use client";

import { useAppearance } from "@/components/AppearanceProvider";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import {
  ShippingError,
  assignShipment,
  createShipment,
  deliverShipment,
  codeAttemptsLeft,
  failShipment,
  listShipments,
  retryShipment,
  returnShipment,
  startShipment,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/shipping";

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "En attente",
  in_transit: "En cours",
  delivered: "Livrée",
  failed_attempt: "Échec de livraison",
  returned: "Retournée",
};

export default function ShipmentsPage() {
  const { tr } = useAppearance();
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [filter, setFilter] = useState<ShipmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listShipments(token, filter ?? undefined)
      .then(setShipments)
      .catch((caught) => setError(caught instanceof ShippingError ? caught.message : tr("Livraisons indisponibles.")))
      .finally(() => setLoading(false));
  }, [token, filter, tr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleAction(id: number, run: () => Promise<Shipment>) {
    setPendingId(id);
    setError(null);
    try {
      const updated = await run();
      setShipments((current) => current.map((shipment) => (shipment.id === id ? updated : shipment)));
    } catch (caught) {
      setError(caught instanceof ShippingError ? caught.message : tr("L'action a échoué."));
    } finally {
      setPendingId(null);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{tr("Vérification de la session…")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{tr("Connectez-vous pour accéder aux livraisons.")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {tr("Se connecter")}
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">{tr("Livraisons")}</h1>

        <NewShipmentForm
          onCreate={async (orderNumber, assignedTo) => {
            if (!token) return;
            const created = await createShipment(token, orderNumber, assignedTo);
            setShipments((current) => [created, ...current]);
          }}
        />

        <nav className="flex flex-wrap gap-2">
          <FilterPill active={filter === null} onClick={() => setFilter(null)}>
            {tr("Toutes")}
          </FilterPill>
          {(["pending", "in_transit", "delivered", "failed_attempt", "returned"] as const).map((value) => (
            <FilterPill key={value} active={filter === value} onClick={() => setFilter(value)}>
              {tr(STATUS_LABEL[value])}
            </FilterPill>
          ))}
        </nav>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
        ) : shipments.length === 0 ? (
          <p className="text-sm text-ink-soft">{tr("Aucune livraison.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">{tr("Commande")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Client")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Adresse")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Livreur")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Tentatives")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Statut")}</th>
                  <th className="py-2 font-medium">{tr("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => (
                  <tr key={shipment.id} className="border-b border-line">
                    <td className="py-3 pr-4 text-ink">{shipment.order_number}</td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {shipment.customer_name}
                      <br />
                      <span className="text-xs">{shipment.customer_phone}</span>
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {shipment.delivery_address}
                      {shipment.delivery_city ? `, ${shipment.delivery_city}` : ""}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {shipment.assigned_to ? `#${shipment.assigned_to}` : (
                        <AssignForm
                          onAssign={(assignedTo) =>
                            handleAction(shipment.id, () => {
                              if (!token) throw new ShippingError("Session expirée.");
                              return assignShipment(token, shipment.id, assignedTo);
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="py-3 pr-4 text-ink">{shipment.attempts}</td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {tr(STATUS_LABEL[shipment.status])}
                      {shipment.notes ? <div className="text-xs text-ink-soft">{shipment.notes}</div> : null}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {shipment.status === "pending" ? (
                          <ActionButton
                            disabled={pendingId === shipment.id}
                            onClick={() =>
                              handleAction(shipment.id, () => {
                                if (!token) throw new ShippingError("Session expirée.");
                                return startShipment(token, shipment.id);
                              })
                            }
                          >
                            {tr("Dispatcher")}
                          </ActionButton>
                        ) : null}
                        {shipment.status === "in_transit" ? (
                          <>
                            <ActionButton
                              disabled={pendingId === shipment.id || shipment.code_locked}
                              onClick={() => {
                                const code = window.prompt(
                                  `Code de confirmation remis au client (${codeAttemptsLeft(shipment)} essai(s) restant(s)) :`,
                                );
                                if (!code) return;
                                void handleAction(shipment.id, () => {
                                  if (!token) throw new ShippingError("Session expirée.");
                                  return deliverShipment(token, shipment.id, code.trim());
                                });
                              }}
                            >
                              {shipment.code_locked ? tr("Verrouillée") : tr("Confirmer la livraison")}
                            </ActionButton>
                            <FailForm
                              onFail={(notes) =>
                                handleAction(shipment.id, () => {
                                  if (!token) throw new ShippingError("Session expirée.");
                                  return failShipment(token, shipment.id, notes);
                                })
                              }
                            />
                          </>
                        ) : null}
                        {shipment.status === "failed_attempt" ? (
                          <>
                            <ActionButton
                              disabled={pendingId === shipment.id}
                              onClick={() =>
                                handleAction(shipment.id, () => {
                                  if (!token) throw new ShippingError("Session expirée.");
                                  return retryShipment(token, shipment.id);
                                })
                              }
                            >
                              {tr("Réessayer")}
                            </ActionButton>
                            <ActionButton
                              danger
                              disabled={pendingId === shipment.id}
                              onClick={() =>
                                handleAction(shipment.id, () => {
                                  if (!token) throw new ShippingError("Session expirée.");
                                  return returnShipment(token, shipment.id);
                                })
                              }
                            >
                              {tr("Retourner")}
                            </ActionButton>
                          </>
                        ) : null}
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
        active ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  onClick,
  disabled,
  danger = false,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-sm border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
        danger ? "border-danger text-danger" : "border-gold text-gold"
      }`}
    >
      {children}
    </button>
  );
}

function AssignForm({ onAssign }: { onAssign: (assignedTo: number) => void }) {
  const { tr } = useAppearance();
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (value) onAssign(Number(value));
      }}
      className="flex items-center gap-1"
    >
      <input
        type="number"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={tr("ID livreur")}
        className="w-20 rounded-sm border border-line bg-surface px-2 py-1 text-xs text-ink"
      />
      <button type="submit" className="rounded-sm border border-line px-2 py-1 text-xs text-ink hover:border-gold">
        {tr("Assigner")}
      </button>
    </form>
  );
}

function FailForm({ onFail }: { onFail: (notes?: string) => void }) {
  const { tr } = useAppearance();
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-sm border border-danger px-2 py-1 text-xs text-danger"
      >
        {tr("Échec de livraison")}
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onFail(notes || undefined);
        setOpen(false);
      }}
      className="flex items-center gap-1"
    >
      <input
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={tr("Motif (optionnel)")}
        className="w-32 rounded-sm border border-line bg-surface px-2 py-1 text-xs text-ink"
      />
      <button type="submit" className="rounded-sm border border-danger px-2 py-1 text-xs text-danger">
        {tr("Confirmer")}
      </button>
    </form>
  );
}

function NewShipmentForm({
  onCreate,
}: {
  onCreate: (orderNumber: string, assignedTo?: number) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [orderNumber, setOrderNumber] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!orderNumber) {
      setFormError("Le numéro de commande est requis.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate(orderNumber, assignedTo ? Number(assignedTo) : undefined);
      setOrderNumber("");
      setAssignedTo("");
    } catch (caught) {
      setFormError(caught instanceof ShippingError ? caught.message : tr("Création impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("N° commande")}
        <input
          value={orderNumber}
          onChange={(event) => setOrderNumber(event.target.value)}
          placeholder={tr("TCH-20261025-XXXXXX")}
          className="w-48 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {tr("Livreur (ID, optionnel)")}
        <input
          type="number"
          value={assignedTo}
          onChange={(event) => setAssignedTo(event.target.value)}
          className="w-32 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <Button type="submit" disabled={submitting}>
        {tr("Créer la livraison")}
      </Button>

      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}
