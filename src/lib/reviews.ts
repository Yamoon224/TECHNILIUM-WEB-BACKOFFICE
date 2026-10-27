/**
 * Review moderation (backend Customers module, `/admin/reviews`). A clean
 * review is published automatically; the ones the screening flagged wait
 * here for a person.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type ReviewStatus = "pending" | "published" | "rejected";

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: "À modérer",
  published: "Publié",
  rejected: "Rejeté",
};

export interface Review {
  id: number;
  product_id: number;
  rating: number;
  title: string | null;
  body: string | null;
  author_name: string;
  status: ReviewStatus;
  rejection_reason: string | null;
  customer_id: number;
  order_number: string;
  moderated_by: number | null;
  published_at: string | null;
  created_at: string | null;
}

export class ReviewsError extends Error {}

/** A review can be published unless it already is (also restores a rejected one). */
export function canPublish(review: Pick<Review, "status">): boolean {
  return review.status !== "published";
}

/** A review can be rejected unless it already is (also takes a published one down). */
export function canReject(review: Pick<Review, "status">): boolean {
  return review.status !== "rejected";
}

export function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

/** How many reviews are waiting for a decision. */
export function pendingCount(reviews: readonly Pick<Review, "status">[]): number {
  return reviews.filter((review) => review.status === "pending").length;
}

async function parseError(response: Response): Promise<ReviewsError> {
  try {
    const body = (await response.json()) as { message?: string };
    return new ReviewsError(body.message ?? `Erreur inattendue (${response.status}).`);
  } catch {
    return new ReviewsError(`Erreur inattendue (${response.status}).`);
  }
}

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" };
}

export async function listReviews(token: string, status?: ReviewStatus): Promise<Review[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (status) params.set("status", status);

  const response = await fetch(`${API_BASE_URL}/admin/reviews?${params.toString()}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!response.ok) throw await parseError(response);
  return ((await response.json()) as { data: Review[] }).data;
}

export async function publishReview(token: string, id: number): Promise<Review> {
  const response = await fetch(`${API_BASE_URL}/admin/reviews/${id}/publish`, { method: "POST", headers: headers(token) });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Review>;
}

export async function rejectReview(token: string, id: number, reason?: string): Promise<Review> {
  const response = await fetch(`${API_BASE_URL}/admin/reviews/${id}/reject`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(reason ? { reason } : {}),
  });
  if (!response.ok) throw await parseError(response);
  return response.json() as Promise<Review>;
}
