/**
 * Client-side access to the flash announcements (backend/app/Modules/Promotions):
 * the image pop-up shown on the storefront's home page.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface Announcement {
  id: number;
  title: string;
  image_url: string;
  link_url: string | null;
  width: number;
  height: number;
  delay_seconds: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface AnnouncementInput {
  title: string;
  /** Required when creating; a new file replaces the current image when editing. */
  image: File | null;
  link_url: string;
  width: number;
  height: number;
  delay_seconds: number;
  /** `datetime-local` values ("2026-11-01T08:00") or "". */
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

export type AnnouncementState = "active" | "scheduled" | "expired" | "inactive";

export const ANNOUNCEMENT_STATE_LABEL: Record<AnnouncementState, string> = {
  active: "En cours",
  scheduled: "Programmée",
  expired: "Expirée",
  inactive: "Désactivée",
};

export class AnnouncementError extends Error {}

export const MAX_ANNOUNCEMENT_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Early, friendly refusal; the server validates the real content again. */
export function announcementImageProblem(file: Pick<File, "type" | "size">): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Format non accepté : utilisez JPG, PNG ou WebP.";
  if (file.size > MAX_ANNOUNCEMENT_BYTES) return "L'image dépasse 4 Mo.";
  return null;
}

/** What the storefront does with it right now. */
export function announcementState(announcement: Announcement, now: Date): AnnouncementState {
  if (!announcement.is_active) return "inactive";
  if (announcement.starts_at && new Date(announcement.starts_at) > now) return "scheduled";
  if (announcement.ends_at && new Date(announcement.ends_at) <= now) return "expired";
  return "active";
}

/** An ISO date as a `datetime-local` value in the browser's time zone; "" when there is none. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A `datetime-local` value as an ISO instant (what the server stores); "" stays "". */
export function fromLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

async function parseError(response: Response): Promise<AnnouncementError> {
  try {
    const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
    const first = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    return new AnnouncementError(first ?? body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new AnnouncementError(`Erreur inattendue (${response.status}).`);
  }
}

function auth(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

function formData(input: AnnouncementInput): FormData {
  const body = new FormData();
  body.append("title", input.title);
  if (input.image) body.append("image", input.image);
  body.append("link_url", input.link_url);
  body.append("width", String(input.width));
  body.append("height", String(input.height));
  body.append("delay_seconds", String(input.delay_seconds));
  body.append("starts_at", fromLocalInput(input.starts_at));
  body.append("ends_at", fromLocalInput(input.ends_at));
  body.append("is_active", input.is_active ? "1" : "0");
  return body;
}

export async function listAnnouncements(token: string): Promise<Announcement[]> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements`, { headers: auth(token), cache: "no-store" });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Announcement[]>;
}

// No Content-Type below: the browser sets the multipart boundary itself.
export async function createAnnouncement(token: string, input: AnnouncementInput): Promise<Announcement> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements`, { method: "POST", headers: auth(token), body: formData(input) });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Announcement>;
}

export async function updateAnnouncement(token: string, id: number, input: AnnouncementInput): Promise<Announcement> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements/${id}`, { method: "POST", headers: auth(token), body: formData(input) });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Announcement>;
}

export async function deleteAnnouncement(token: string, id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/announcements/${id}`, { method: "DELETE", headers: auth(token) });
  if (!response.ok) throw await parseError(response);
}
