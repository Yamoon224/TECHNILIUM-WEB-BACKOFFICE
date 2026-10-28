/**
 * Client-side access to the Audit module (`/admin/audit`, backend Audit
 * module): the read-only trail of back-office actions and its integrity check.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface AuditEntry {
  id: number;
  user_id: number | null;
  user_name: string | null;
  roles: string | null;
  method: string;
  path: string;
  route: string | null;
  status: number;
  payload: Record<string, unknown> | null;
  ip: string | null;
  occurred_at: string;
}

export interface AuditVerification {
  valid: boolean;
  checked: number;
  broken_at: number | null;
  reason: string | null;
}

export interface AuditFilters {
  user_id?: string;
  method?: string;
  path?: string;
  failed?: boolean;
  from?: string;
  to?: string;
}

export const AUDIT_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

export class AuditError extends Error {}

/** A refused or failed attempt: the entries worth a second look. */
export function isFailure(entry: Pick<AuditEntry, "status">): boolean {
  return entry.status >= 400;
}

/** 403 is a refusal by permission; 4xx/5xx otherwise a failed request. */
export function outcomeLabel(status: number): string {
  if (status === 403) return "Refusé (droits)";
  if (status === 401) return "Non authentifié";
  if (status >= 500) return "Erreur serveur";
  if (status >= 400) return "Rejeté";
  return "Réussi";
}

/** The query string for the API, leaving out blank filters. */
export function buildQuery(filters: AuditFilters): string {
  const params = new URLSearchParams({ per_page: "100" });

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "" || value === false) continue;
    params.set(key, value === true ? "1" : String(value));
  }

  return params.toString();
}

async function parseError(response: Response): Promise<AuditError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new AuditError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new AuditError(`Erreur inattendue (${response.status}).`);
  }
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

export async function listAuditEntries(token: string, filters: AuditFilters = {}): Promise<AuditEntry[]> {
  const response = await fetch(`${API_BASE_URL}/admin/audit?${buildQuery(filters)}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as { data: AuditEntry[] }).data;
}

export async function verifyAuditChain(token: string): Promise<AuditVerification> {
  const response = await fetch(`${API_BASE_URL}/admin/audit/verify`, { headers: headers(token), cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<AuditVerification>;
}

/** What the access-management routes mean in plain words; null for any other route. */
export function describeAction(entry: Pick<AuditEntry, "method" | "route">): string | null {
  const route = (entry.route ?? "").replace(/^api\/v1\//, "");

  if (route === "admin/access/groups" && entry.method === "POST") return "Création d'un groupe d'utilisateurs";
  if (route === "admin/access/groups/{name}" && entry.method === "PUT") return "Modification d'un groupe d'utilisateurs";
  if (route === "admin/access/groups/{name}" && entry.method === "DELETE") return "Suppression d'un groupe d'utilisateurs";
  if (route === "admin/access/switches") return "Activation ou désactivation d'une fonctionnalité";
  if (route === "admin/access/users/{user}/roles") return "Changement des groupes d'un compte";

  return null;
}
