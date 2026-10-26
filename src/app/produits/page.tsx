"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import {
  CatalogError,
  archiveProduct,
  createProduct,
  listCategories,
  listProducts,
  updateProduct,
  type Category,
  type Product,
} from "@/lib/catalog";

const STATUS_LABEL: Record<Product["status"], string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export default function ProductsPage() {
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    Promise.all([listProducts(token), listCategories(token)])
      .then(([productPage, categoryList]) => {
        setProducts(productPage.data);
        setCategories(categoryList);
      })
      .catch((caught) => setError(caught instanceof CatalogError ? caught.message : "Produits indisponibles."))
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

  async function handleArchive(id: number) {
    if (!token) return;
    setError(null);
    try {
      const updated = await archiveProduct(token, id);
      setProducts((current) => current.map((product) => (product.id === id ? updated : product)));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "Archivage impossible.");
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">Vérification de la session…</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">Connectez-vous pour accéder aux produits.</p>
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
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink">Produits</h1>
          <Button onClick={() => setShowForm((current) => !current)}>
            {showForm ? "Fermer" : "Nouveau produit"}
          </Button>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {showForm ? (
          <NewProductForm
            categories={categories}
            onCreate={async (input) => {
              if (!token) return;
              const created = await createProduct(token, input);
              setProducts((current) => [created, ...current]);
              setShowForm(false);
            }}
          />
        ) : null}

        {loading ? (
          <p className="text-sm text-ink-soft">Chargement…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-ink-soft">Aucun produit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">Produit</th>
                  <th className="py-2 pr-4 font-medium">SKU</th>
                  <th className="py-2 pr-4 font-medium">Prix</th>
                  <th className="py-2 pr-4 font-medium">Stock</th>
                  <th className="py-2 pr-4 font-medium">Statut</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) =>
                  editingId === product.id ? (
                    <EditProductRow
                      key={product.id}
                      product={product}
                      onSave={async (patch) => {
                        if (!token) return;
                        try {
                          const updated = await updateProduct(token, product.id, patch);
                          setProducts((current) => current.map((p) => (p.id === product.id ? updated : p)));
                          setEditingId(null);
                        } catch (caught) {
                          setError(caught instanceof CatalogError ? caught.message : "Mise à jour impossible.");
                        }
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={product.id} className="border-b border-line">
                      <td className="py-3 pr-4 text-ink">
                        {product.brand} {product.name}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{product.sku ?? "—"}</td>
                      <td className="py-3 pr-4 text-ink">
                        {product.price_amount?.toLocaleString("fr-FR") ?? "—"} {product.currency}
                      </td>
                      <td className="py-3 pr-4 text-ink">{product.stock_quantity ?? "—"}</td>
                      <td className="py-3 pr-4 text-ink-soft">{STATUS_LABEL[product.status]}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(product.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                          >
                            Modifier
                          </button>
                          {product.status !== "archived" ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(product.id)}
                              className="rounded-sm border border-line px-2 py-1 text-xs text-danger transition-colors hover:border-danger"
                            >
                              Archiver
                            </button>
                          ) : null}
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

function NewProductForm({
  categories,
  onCreate,
}: {
  categories: Category[];
  onCreate: (input: {
    category_id: number;
    brand: string;
    name: string;
    price_amount: number;
    stock_quantity: number;
  }) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ? String(categories[0].id) : "");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!categoryId || !brand.trim() || !name.trim() || !price || !stock) {
      setFormError("Tous les champs sont requis.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        category_id: Number(categoryId),
        brand: brand.trim(),
        name: name.trim(),
        price_amount: Number(price),
        stock_quantity: Number(stock),
      });
      setBrand("");
      setName("");
      setPrice("");
      setStock("");
    } catch (caught) {
      setFormError(caught instanceof CatalogError ? caught.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Catégorie
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Marque
        <input
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder="Samsung"
          className="w-32 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Nom
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Galaxy A15"
          className="w-48 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Prix (F CFA)
        <input
          type="number"
          min={0}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="w-28 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Stock
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          className="w-20 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
      </label>

      <Button type="submit" disabled={submitting}>
        Créer
      </Button>

      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}

function EditProductRow({
  product,
  onSave,
  onCancel,
}: {
  product: Product;
  onSave: (patch: { price_amount: number; stock_quantity: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [price, setPrice] = useState(product.price_amount ?? 0);
  const [stock, setStock] = useState(product.stock_quantity ?? 0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      await onSave({ price_amount: price, stock_quantity: stock });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr className="border-b border-line bg-surface-raised">
      <td className="py-2 pr-4 text-ink">
        {product.brand} {product.name}
      </td>
      <td className="py-2 pr-4 text-ink-soft">{product.sku ?? "—"}</td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min={0}
          value={price}
          onChange={(event) => setPrice(Number(event.target.value))}
          className="w-24 rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink"
        />
      </td>
      <td className="py-2 pr-4">
        <input
          type="number"
          min={0}
          value={stock}
          onChange={(event) => setStock(Number(event.target.value))}
          className="w-16 rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink"
        />
      </td>
      <td className="py-2 pr-4 text-ink-soft">{STATUS_LABEL[product.status]}</td>
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
