"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { useAuth } from "@/lib/useAuth";
import {
  CATEGORY_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  SupportError,
  canReply,
  countOpen,
  getTicket,
  listTickets,
  replyToTicket,
  statusActions,
  updateTicket,
  type Ticket,
  type TicketFilters,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/support";

const STATUSES: TicketStatus[] = ["open", "pending_customer", "resolved", "closed"];

export default function SupportPage() {
  const router = useRouter();
  const { status: sessionStatus, token, user, logout } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listTickets(token, { ...filters, q: query })
      .then(setTickets)
      .catch((caught) => setError(caught instanceof SupportError ? caught.message : "File indisponible."))
      .finally(() => setLoading(false));
  }, [token, filters, query]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function toggle(ticket: Ticket) {
    if (!token) return;
    if (open?.id === ticket.id) {
      setOpen(null);
      return;
    }
    try {
      setOpen(await getTicket(token, ticket.id));
    } catch (caught) {
      setError(caught instanceof SupportError ? caught.message : "Ticket indisponible.");
    }
  }

  /** Applies the API's fresh copy of the ticket to the open panel and the list. */
  function applyUpdated(updated: Ticket) {
    setOpen(updated);
    setTickets((current) => current.map((ticket) => (ticket.id === updated.id ? { ...ticket, ...updated, messages: undefined } : ticket)));
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder au support.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm transition-colors ${
      active ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
    }`;

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} roles={user?.roles} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">Support client</h1>
          <p className="text-sm text-ink-soft">{countOpen(tickets)} à traiter dans cette vue</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFilters({})} className={pill(Object.keys(filters).length === 0)}>
            Tous
          </button>
          {STATUSES.map((status) => (
            <button key={status} type="button" onClick={() => setFilters({ status })} className={pill(filters.status === status)}>
              {STATUS_LABEL[status]}
            </button>
          ))}
          <button type="button" onClick={() => setFilters({ overdue: true })} className={pill(filters.overdue === true)}>
            En retard
          </button>
          <button type="button" onClick={() => setFilters({ assigned: "me" })} className={pill(filters.assigned === "me")}>
            Mes tickets
          </button>
          <button type="button" onClick={() => setFilters({ assigned: "none" })} className={pill(filters.assigned === "none")}>
            Non assignés
          </button>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un sujet"
            aria-label="Rechercher un sujet"
            className="w-56 rounded-sm border border-line bg-surface px-3 py-1.5 text-sm text-ink"
          />
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun ticket.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Ticket</th>
                  <th className="py-2 pr-4 font-medium">Sujet</th>
                  <th className="py-2 pr-4 font-medium">Catégorie</th>
                  <th className="py-2 pr-4 font-medium">Priorité</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  <th className="py-2 font-medium">Assigné</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <Fragment key={ticket.id}>
                    <tr onClick={() => toggle(ticket)} className="cursor-pointer border-b border-line hover:bg-surface">
                      <td className="py-3 pr-4 text-ink">{ticket.number}</td>
                      <td className="py-3 pr-4 text-ink">
                        {ticket.subject}
                        {ticket.overdue ? <span className="ml-2 text-xs text-danger">en retard</span> : null}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{CATEGORY_LABEL[ticket.category] ?? ticket.category}</td>
                      <td className={`py-3 pr-4 ${ticket.priority === "high" ? "text-gold-bright" : "text-ink-soft"}`}>
                        {PRIORITY_LABEL[ticket.priority]}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{STATUS_LABEL[ticket.status]}</td>
                      <td className="py-3 text-ink-soft">{ticket.assigned_to === null ? "—" : ticket.assigned_to === user?.id ? "Moi" : `#${ticket.assigned_to}`}</td>
                    </tr>
                    {open?.id === ticket.id ? (
                      <tr className="border-b border-line bg-surface">
                        <td colSpan={6} className="px-3 py-4">
                          <TicketPanel token={token} ticket={open} onUpdated={applyUpdated} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function TicketPanel({ token, ticket, onUpdated }: { token: string; ticket: Ticket; onUpdated: (ticket: Ticket) => void }) {
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<Ticket>, fallback: string) {
    setBusy(true);
    setError(null);
    try {
      onUpdated(await action());
    } catch (caught) {
      setError(caught instanceof SupportError ? caught.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    await run(() => replyToTicket(token, ticket.id, body.trim(), internal), "Envoi impossible.");
    setBody("");
  }

  const small = "rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} className={small} onClick={() => run(() => updateTicket(token, ticket.id, { assigned_to_me: ticket.assigned_to === null }), "Assignation impossible.")}>
          {ticket.assigned_to === null ? "Prendre" : "Libérer"}
        </button>

        <label className="flex items-center gap-1 text-xs text-ink-soft">
          Priorité
          <select
            value={ticket.priority}
            disabled={busy}
            onChange={(event) => run(() => updateTicket(token, ticket.id, { priority: event.target.value as TicketPriority }), "Changement impossible.")}
            className="rounded-sm border border-line bg-surface px-2 py-1 text-xs text-ink"
          >
            {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {statusActions(ticket.status).map((action) => (
          <button key={action.target} type="button" disabled={busy} className={small} onClick={() => run(() => updateTicket(token, ticket.id, { status: action.target }), "Changement impossible.")}>
            {action.label}
          </button>
        ))}

        <span className="text-xs text-ink-soft">
          Client #{ticket.customer_id}
          {ticket.order_number ? ` · commande ${ticket.order_number}` : ""}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {(ticket.messages ?? []).map((message) => (
          <li
            key={message.id}
            className={`max-w-[80%] rounded-sm border p-3 text-sm ${
              message.internal ? "self-end border-gold-deep" : message.from === "customer" ? "self-start border-line" : "self-end border-line bg-bg"
            }`}
          >
            <p className="mb-1 text-xs text-ink-soft">
              {message.internal ? "Note interne" : message.from === "customer" ? "Client" : `Équipe #${message.author_id}`}
            </p>
            <p className="whitespace-pre-wrap text-ink">{message.body}</p>
          </li>
        ))}
      </ul>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {canReply(ticket.status) ? (
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={5000}
            placeholder={internal ? "Note visible de l'équipe uniquement…" : "Réponse envoyée au client…"}
            className="rounded-sm border border-line bg-bg px-3 py-2 text-sm text-ink"
          />
          <div className="flex items-center gap-4">
            <button type="submit" disabled={busy || !body.trim()} className="rounded-sm border border-gold px-3 py-1.5 text-sm text-gold transition-colors disabled:opacity-50">
              {internal ? "Ajouter la note" : "Répondre"}
            </button>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />
              Note interne (invisible du client)
            </label>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-soft">Ticket clos : aucune réponse possible.</p>
      )}
    </div>
  );
}
