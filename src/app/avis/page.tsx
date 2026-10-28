"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { useAuth } from "@/lib/useAuth";
import {
  REVIEW_STATUS_LABEL,
  ReviewsError,
  canPublish,
  canReject,
  listReviews,
  pendingCount,
  publishReview,
  rejectReview,
  stars,
  type Review,
  type ReviewStatus,
} from "@/lib/reviews";

const STATUSES: ReviewStatus[] = ["pending", "published", "rejected"];

export default function ReviewsPage() {
  const router = useRouter();
  const { status: sessionStatus, token, user, logout } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<ReviewStatus | null>("pending");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listReviews(token, filter ?? undefined)
      .then(setReviews)
      .catch((caught) => setError(caught instanceof ReviewsError ? caught.message : "Avis indisponibles."))
      .finally(() => setLoading(false));
  }, [token, filter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function decide(review: Review, action: "publish" | "reject") {
    if (!token) return;

    let reason: string | undefined;
    if (action === "reject") {
      const input = window.prompt("Motif du rejet (montré à l'auteur) :");
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    setBusyId(review.id);
    setError(null);
    try {
      await (action === "publish" ? publishReview(token, review.id) : rejectReview(token, review.id, reason));
      refresh();
    } catch (caught) {
      setError(caught instanceof ReviewsError ? caught.message : "La décision a échoué.");
    } finally {
      setBusyId(null);
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour modérer les avis.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} roles={user?.roles} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">Avis clients</h1>
          <p className="text-sm text-ink-soft">{pendingCount(reviews)} à modérer dans cette vue</p>
        </div>

        <nav className="flex flex-wrap gap-2">
          {[null, ...STATUSES].map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                filter === value ? "border-gold bg-gold text-on-primary font-medium" : "border-line text-ink hover:border-gold"
              }`}
            >
              {value === null ? "Tous" : REVIEW_STATUS_LABEL[value]}
            </button>
          ))}
        </nav>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun avis.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-2 rounded-sm border border-line p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2">
                    <span className="text-gold-bright">{stars(review.rating)}</span>
                    {review.title ? <span className="font-medium text-ink">{review.title}</span> : null}
                  </p>
                  <span className={review.status === "pending" ? "text-gold-bright" : "text-ink-soft"}>
                    {REVIEW_STATUS_LABEL[review.status]}
                  </span>
                </div>

                {review.body ? <p className="whitespace-pre-wrap text-ink-soft">{review.body}</p> : null}

                <p className="text-xs text-ink-soft">
                  {review.author_name} · client #{review.customer_id} · produit #{review.product_id} · commande{" "}
                  {review.order_number}
                  {review.rejection_reason ? ` · motif du rejet : ${review.rejection_reason}` : ""}
                </p>

                <div className="flex gap-2">
                  {canPublish(review) ? (
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => decide(review, "publish")}
                      className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
                    >
                      {review.status === "rejected" ? "Rétablir" : "Publier"}
                    </button>
                  ) : null}
                  {canReject(review) ? (
                    <button
                      type="button"
                      disabled={busyId === review.id}
                      onClick={() => decide(review, "reject")}
                      className="rounded-sm border border-danger px-2 py-1 text-xs text-danger transition-colors disabled:opacity-50"
                    >
                      {review.status === "published" ? "Retirer" : "Rejeter"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-ink-soft">
          Un avis ne peut venir que d&apos;un acheteur ayant reçu le produit. Les avis propres sont publiés
          automatiquement ; ceux qui contiennent un lien, un e-mail, un numéro de téléphone ou un mot interdit attendent ici.
        </p>
      </main>
    </div>
  );
}
