/**
 * Client-side access to the access management API (`/admin/access`, backend Identity module, super
 * admin only): the features, the user groups (built-in profiles and custom ones), the on/off
 * switches per group or user, and the accounts of the team.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface AccessFeature {
  key: string;
  label: string;
  label_en: string;
  group: string;
  group_en: string;
}

export interface AccessGroup {
  name: string;
  label: string;
  description: string | null;
  builtin: boolean;
  members: number;
  /** The features this group holds (fixed for a built-in profile, ticked for a custom one). */
  permissions: string[];
}

export type SubjectType = "role" | "user";

export interface AccessSwitch {
  feature: string;
  subject_type: SubjectType;
  subject: string;
  enabled: boolean;
}

export interface AccessOverview {
  features: AccessFeature[];
  groups: AccessGroup[];
  switches: AccessSwitch[];
}

export interface AccessUser {
  id: number;
  name: string;
  email: string | null;
  is_active: boolean;
  roles: string[];
  /** Switches set on this very account: true = forced on, false = switched off. */
  switches: Record<string, boolean>;
}

export class AccessError extends Error {}

async function call<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/admin/access${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", ...init.headers },
  });

  if (!response.ok) {
    let message = `Erreur inattendue (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
      message = body.errors ? Object.values(body.errors)[0]?.[0] ?? message : body.message ?? message;
    } catch {
      // keep the generic message
    }
    throw new AccessError(message);
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export const loadAccess = (token: string) => call<AccessOverview>(token, "");

export const listAccessUsers = (token: string, search = "") => call<AccessUser[]>(token, search ? `/users?search=${encodeURIComponent(search)}` : "/users");

export interface GroupInput {
  label: string;
  description: string | null;
  permissions: string[];
}

export const createGroup = (token: string, input: GroupInput) => call<AccessGroup>(token, "/groups", { method: "POST", body: JSON.stringify(input) });

export const updateGroup = (token: string, name: string, input: GroupInput) =>
  call<AccessGroup>(token, `/groups/${encodeURIComponent(name)}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteGroup = (token: string, name: string) => call<void>(token, `/groups/${encodeURIComponent(name)}`, { method: "DELETE" });

export const assignRoles = (token: string, userId: number, roles: string[]) =>
  call<{ id: number; roles: string[] }>(token, `/users/${userId}/roles`, { method: "PUT", body: JSON.stringify({ roles }) });

/** enabled: true = on, false = off, null = back to the default. */
export const setSwitch = (token: string, feature: string, subjectType: SubjectType, subject: string, enabled: boolean | null) =>
  call<void>(token, "/switches", { method: "PUT", body: JSON.stringify({ feature, subject_type: subjectType, subject, enabled }) });

// --- pure helpers -----------------------------------------------------------------------------

/** The features gathered by section, in the order the API sends them. */
export function featuresBySection(features: readonly AccessFeature[], english = false): { section: string; features: AccessFeature[] }[] {
  const sections: { section: string; features: AccessFeature[] }[] = [];

  for (const feature of features) {
    const name = english ? feature.group_en : feature.group;
    const existing = sections.find((candidate) => candidate.section === name);
    if (existing) existing.features.push(feature);
    else sections.push({ section: name, features: [feature] });
  }

  return sections;
}

/** The switch set for a group or a user on a feature: true, false, or null when none. */
export function switchFor(switches: readonly AccessSwitch[], feature: string, type: SubjectType, subject: string): boolean | null {
  return switches.find((row) => row.feature === feature && row.subject_type === type && row.subject === subject)?.enabled ?? null;
}

/**
 * The next state when a switch is clicked. A group is either left alone or switched off; one account
 * can also be forced on (to give back what its group lost).
 */
export function nextSwitch(current: boolean | null, type: SubjectType): boolean | null {
  if (current === null) return false;
  if (current === false) return type === "user" ? true : null;

  return null;
}

/** Applies a change to the switches already loaded, without asking the server again. */
export function withSwitch(switches: readonly AccessSwitch[], change: Omit<AccessSwitch, "enabled"> & { enabled: boolean | null }): AccessSwitch[] {
  const others = switches.filter((row) => !(row.feature === change.feature && row.subject_type === change.subject_type && row.subject === change.subject));

  return change.enabled === null ? others : [...others, { ...change, enabled: change.enabled }];
}

/** Groups an account can be put in: everything but the customer profile. */
export function assignableGroups(groups: readonly AccessGroup[]): AccessGroup[] {
  return groups.filter((group) => group.name !== "client");
}

/** Toggles a value in a list, keeping the order of appearance. */
export function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
