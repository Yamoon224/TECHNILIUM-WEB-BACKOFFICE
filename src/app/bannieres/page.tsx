"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAppearance } from "@/components/AppearanceProvider";
import { useAuth } from "@/lib/useAuth";
import {
  CatalogError,
  MAX_BANNER_IMAGES,
  addBanner,
  bannerImageProblem,
  deleteBanner,
  listBanners,
  updateBanner,
  type Banner,
  type BannerPlacement,
} from "@/lib/catalog";

const PLACEMENTS: { value: BannerPlacement; title: string; help: string }[] = [
  { value: "hero", title: "Bannière du haut de l'accueil", help: "Les images défilent à la place du bloc orange, en haut de la page d'accueil." },
  { value: "footer", title: "Bannière avant le pied de page", help: "Les images défilent sur toutes les pages, juste avant le pied de page." },
];

export default function BannersPage() {
  const { tr } = useAppearance();
  const router = useRouter();
  const { status: sessionStatus, token, user, logout } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;
    setLoading(true);
    listBanners(token)
      .then(setBanners)
      .catch((caught) => setError(caught instanceof CatalogError ? caught.message : tr("Bannières indisponibles.")))
      .finally(() => setLoading(false));
  }, [token, tr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  /** Runs a change, then reloads the list (positions move together). */
  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      refresh();
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : tr("L'action a échoué."));
    }
  }

  async function swap(slides: Banner[], index: number, other: number) {
    if (!token) return;
    const [first, second] = index < other ? [slides[index], slides[other]] : [slides[other], slides[index]];
    // Positions can tie after deletions: the pair gets distinct, swapped ranks.
    const base = Math.min(first.position, second.position);
    await run(async () => {
      await updateBanner(token, second.id, { position: base });
      await updateBanner(token, first.id, { position: base + 1 });
    });
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{tr("Vérification de la session…")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{tr("Connectez-vous pour accéder aux bannières.")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {tr("Se connecter")}
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} roles={user?.roles} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="page-title font-display text-2xl font-semibold text-ink">{tr("Bannières")}</h1>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {loading && banners.length === 0 ? <p className="text-sm text-ink-soft">{tr("Chargement…")}</p> : null}

        {PLACEMENTS.map(({ value, title, help }) => {
          const slides = banners.filter((banner) => banner.placement === value);

          return (
            <section key={value} className="flex flex-col gap-4 rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">{tr(title)}</h2>
                <p className="text-sm text-ink-soft">{tr(help)}</p>
              </div>

              {slides.length === 0 ? <p className="text-sm text-ink-soft">{tr("Aucune image.")}</p> : null}

              <ul className="flex flex-col gap-3">
                {slides.map((slide, index) => (
                  <SlideRow
                    key={slide.id}
                    slide={slide}
                    first={index === 0}
                    last={index === slides.length - 1}
                    onMove={(direction) => swap(slides, index, index + direction)}
                    onToggle={() => run(() => updateBanner(token, slide.id, { is_active: !slide.is_active }))}
                    onSave={(altText, link) => run(() => updateBanner(token, slide.id, { title: altText || null, link_url: link || null }))}
                    onDelete={() => run(() => deleteBanner(token, slide.id))}
                  />
                ))}
              </ul>

              {slides.length < MAX_BANNER_IMAGES ? (
                <AddSlideForm
                  room={MAX_BANNER_IMAGES - slides.length}
                  onAdd={(files) =>
                    run(async () => {
                      // Each picked image becomes its own slide, in the order picked.
                      for (const file of files) await addBanner(token, { placement: value, file });
                    })
                  }
                />
              ) : (
                <p className="text-xs text-ink-soft">
                  {tr("Bannière pleine (")}
                  {MAX_BANNER_IMAGES} {tr("images).")}
                </p>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}

function SlideRow({
  slide,
  first,
  last,
  onMove,
  onToggle,
  onSave,
  onDelete,
}: {
  slide: Banner;
  first: boolean;
  last: boolean;
  onMove: (direction: -1 | 1) => void;
  onToggle: () => void;
  onSave: (title: string, link: string) => void;
  onDelete: () => void;
}) {
  const { tr } = useAppearance();
  const [title, setTitle] = useState(slide.title ?? "");
  const [link, setLink] = useState(slide.link_url ?? "");
  const changed = title !== (slide.title ?? "") || link !== (slide.link_url ?? "");
  const iconButton = "rounded-sm border border-line p-1.5 text-ink transition-colors hover:border-gold disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <li className={`flex flex-wrap items-start gap-3 rounded-sm border border-line p-3 ${slide.is_active ? "" : "opacity-60"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image_url} alt={slide.title ?? ""} className="h-24 w-48 rounded-sm border border-line object-cover" />

      <div className="grid min-w-64 flex-1 gap-2 sm:grid-cols-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={tr("Texte alternatif (facultatif)")}
          aria-label={tr("Texte alternatif")}
          maxLength={160}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder={tr("Lien au clic, ex. /?category=smartphones")}
          aria-label={tr("Lien")}
          maxLength={500}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        {changed ? (
          <div>
            <Button type="button" onClick={() => onSave(title, link)}>
              {tr("Enregistrer")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <button type="button" className={iconButton} disabled={first} onClick={() => onMove(-1)} title={tr("Monter")} aria-label={tr("Monter")}>
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={iconButton} disabled={last} onClick={() => onMove(1)} title={tr("Descendre")} aria-label={tr("Descendre")}>
          <ArrowDown className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className={iconButton}
          onClick={onToggle}
          title={slide.is_active ? tr("Masquer") : tr("Afficher")}
          aria-label={slide.is_active ? tr("Masquer") : tr("Afficher")}
        >
          {slide.is_active ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
        </button>
        <button type="button" className={`${iconButton} text-danger`} onClick={onDelete} title={tr("Supprimer")} aria-label={tr("Supprimer")}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </li>
  );
}

function AddSlideForm({ room, onAdd }: { room: number; onAdd: (files: File[]) => Promise<void> }) {
  const { tr } = useAppearance();
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) return;
    setBusy(true);
    await onAdd(files);
    setFiles([]);
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex cursor-pointer flex-col gap-1 text-xs text-ink-soft">
        <span>{tr("Ajouter des images (JPG, PNG, WebP, 4 Mo, 600 px de large au moins)")}</span>
        <input
          key={busy ? "busy" : "idle"}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="text-sm text-ink"
          onChange={(event) => {
            const picked = Array.from(event.target.files ?? []).slice(0, room);
            const refused = picked.map(bannerImageProblem).find(Boolean) ?? null;
            setProblem(refused ? tr(refused) : null);
            setFiles(refused ? [] : picked);
          }}
        />
      </label>
      <Button type="submit" disabled={busy || files.length === 0}>
        {busy ? tr("Envoi…") : tr("Ajouter")}
      </Button>
      {problem ? <p className="w-full text-xs text-danger">{problem}</p> : null}
    </form>
  );
}
