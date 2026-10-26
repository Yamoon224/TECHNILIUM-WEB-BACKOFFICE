"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import {
  CatalogError,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type Category,
} from "@/lib/catalog";

export default function CategoriesPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    listCategories(token)
      .then(setCategories)
      .catch((caught) => setError(caught instanceof CatalogError ? caught.message : "Catégories indisponibles."))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  async function handleCreate(name: string, parentId: number | null) {
    if (!token) return;
    setError(null);
    try {
      const created = await createCategory(token, { name, parent_id: parentId });
      setCategories((current) => [...current, created]);
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "Création impossible.");
      throw caught;
    }
  }

  async function handleSave(id: number, patch: { name: string; is_active: boolean; position: number }) {
    if (!token) return;
    setError(null);
    try {
      const updated = await updateCategory(token, id, patch);
      setCategories((current) => current.map((category) => (category.id === id ? updated : category)));
      setEditingId(null);
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "Mise à jour impossible.");
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    setError(null);
    try {
      await deleteCategory(token, id);
      setCategories((current) => current.filter((category) => category.id !== id));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "Suppression impossible.");
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder aux catégories.</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-ink">Catégories</h1>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <NewCategoryForm categories={categories} onCreate={handleCreate} />

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucune catégorie.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Nom</th>
                  <th className="py-2 pr-4 font-medium">Slug</th>
                  <th className="py-2 pr-4 font-medium">Parente</th>
                  <th className="py-2 pr-4 font-medium">Produits</th>
                  <th className="py-2 pr-4 font-medium">Active</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) =>
                  editingId === category.id ? (
                    <EditCategoryRow
                      key={category.id}
                      category={category}
                      onSave={(patch) => handleSave(category.id, patch)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={category.id} className="border-b border-line">
                      <td className="py-3 pr-4 text-ink">{category.name}</td>
                      <td className="py-3 pr-4 text-ink-soft">{category.slug}</td>
                      <td className="py-3 pr-4 text-ink-soft">
                        {categories.find((c) => c.id === category.parent_id)?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-ink">{category.product_count ?? 0}</td>
                      <td className="py-3 pr-4 text-ink-soft">{category.is_active ? "Oui" : "Non"}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(category.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(category.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-danger transition-colors hover:border-danger"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function NewCategoryForm({
  categories,
  onCreate,
}: {
  categories: Category[];
  onCreate: (name: string, parentId: number | null) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await onCreate(name.trim(), parentId ? Number(parentId) : null);
      setName("");
      setParentId("");
    } catch {
      // error surfaced by parent
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Nom
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex. Accessoires audio"
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Catégorie parente
        <select
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">Aucune</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit" disabled={submitting || !name.trim()}>
        Ajouter
      </Button>
    </form>
  );
}

function EditCategoryRow({
  category,
  onSave,
  onCancel,
}: {
  category: Category;
  onSave: (patch: { name: string; is_active: boolean; position: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [isActive, setIsActive] = useState(category.is_active);
  const [position, setPosition] = useState(category.position);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      await onSave({ name, is_active: isActive, position });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr className="border-b border-line bg-surface-raised">
      <td className="py-2 pr-4">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink"
        />
      </td>
      <td className="py-2 pr-4 text-ink-soft">{category.slug}</td>
      <td className="py-2 pr-4 text-ink-soft">—</td>
      <td className="py-2 pr-4">
        <input
          type="number"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="w-16 rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink"
        />
      </td>
      <td className="py-2 pr-4">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
      </td>
      <td className="py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:border-gold"
          >
            Annuler
          </button>
        </div>
      </td>
    </tr>
  );
}
