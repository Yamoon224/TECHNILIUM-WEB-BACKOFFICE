"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackofficeNav } from "@/components/BackofficeNav";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/useAuth";
import {
  CatalogError,
  addProductImage,
  archiveProduct,
  createProduct,
  imageProblem,
  MAX_GALLERY_IMAGES,
  listCategories,
  listProducts,
  removeProductImage,
  setProductCover,
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
  const [galleryId, setGalleryId] = useState<number | null>(null);
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

  function replaceProduct(updated: Product) {
    setProducts((current) => current.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function handlePhoto(product: Product, file: File | null) {
    if (!token || !file) return;
    const problem = imageProblem(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    try {
      replaceProduct(await addProductImage(token, product.id, file));
    } catch (caught) {
      setError(caught instanceof CatalogError ? (caught.fieldErrors?.image?.[0] ?? caught.message) : "Envoi de la photo impossible.");
    }
  }

  async function handleCover(product: Product, imageId: number) {
    if (!token) return;
    setError(null);
    try {
      replaceProduct(await setProductCover(token, product.id, imageId));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "Changement de couverture impossible.");
    }
  }

  async function handleRemovePhoto(product: Product, imageId: number) {
    if (!token) return;
    setError(null);
    try {
      replaceProduct(await removeProductImage(token, product.id, imageId));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : "Suppression de la photo impossible.");
    }
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
                {products.flatMap((product) => [
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
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image_url} alt="" className="h-10 w-10 rounded-sm border border-line object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-dashed border-line text-[10px] text-ink-soft">
                              Aucune
                            </span>
                          )}
                          {product.brand} {product.name}
                        </div>
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
                          <button
                            type="button"
                            onClick={() => setGalleryId(galleryId === product.id ? null : product.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                          >
                            Photos ({product.images?.length ?? 0})
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
                  galleryId === product.id ? (
                    <tr key={`gallery-${product.id}`} className="border-b border-line bg-surface-raised">
                      <td colSpan={6} className="py-3 pr-4">
                        <Gallery
                          product={product}
                          onAdd={(file) => handlePhoto(product, file)}
                          onCover={(imageId) => handleCover(product, imageId)}
                          onRemove={(imageId) => handleRemovePhoto(product, imageId)}
                        />
                      </td>
                    </tr>
                  ) : null,
                ])}
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

function Gallery({
  product,
  onAdd,
  onCover,
  onRemove,
}: {
  product: Product;
  onAdd: (file: File | null) => void;
  onCover: (imageId: number) => void;
  onRemove: (imageId: number) => void;
}) {
  const images = product.images ?? [];

  return (
    <div className="flex flex-wrap items-start gap-3">
      {images.map((image, index) => (
        <figure key={image.id} className="flex w-28 flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-28 w-28 rounded-sm border border-line object-cover" />
          {index === 0 ? (
            <figcaption className="text-xs font-medium text-gold">Couverture</figcaption>
          ) : (
            <button type="button" onClick={() => onCover(image.id)} className="text-left text-xs text-ink underline-offset-4 hover:text-gold hover:underline">
              Définir comme couverture
            </button>
          )}
          <button type="button" onClick={() => onRemove(image.id)} className="text-left text-xs text-danger underline-offset-4 hover:underline">
            Supprimer
          </button>
        </figure>
      ))}

      {images.length < MAX_GALLERY_IMAGES ? (
        <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line text-center text-xs text-ink-soft transition-colors hover:border-gold">
          + Ajouter
          <span className="px-1 text-[10px]">JPG, PNG, WebP, 2 Mo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              onAdd(event.target.files?.[0] ?? null);
              event.target.value = "";
            }}
          />
        </label>
      ) : (
        <p className="text-xs text-ink-soft">Galerie pleine ({MAX_GALLERY_IMAGES} photos).</p>
      )}
    </div>
  );
}
