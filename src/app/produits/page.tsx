"use client";

import { useAppearance } from "@/components/AppearanceProvider";
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
  const { tr } = useAppearance();
  const router = useRouter();
  const { status: sessionStatus, token, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [galleryId, setGalleryId] = useState<number | null>(null);
  const [textsId, setTextsId] = useState<number | null>(null);
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
      .catch((caught) => setError(caught instanceof CatalogError ? caught.message : tr("Produits indisponibles.")))
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
      setError(
        caught instanceof CatalogError
          ? (caught.fieldErrors?.image?.[0] ?? caught.message)
          : tr("Envoi de la photo impossible."),
      );
    }
  }

  async function handleCover(product: Product, imageId: number) {
    if (!token) return;
    setError(null);
    try {
      replaceProduct(await setProductCover(token, product.id, imageId));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : tr("Changement de couverture impossible."));
    }
  }

  async function handleRemovePhoto(product: Product, imageId: number) {
    if (!token) return;
    setError(null);
    try {
      replaceProduct(await removeProductImage(token, product.id, imageId));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : tr("Suppression de la photo impossible."));
    }
  }

  async function handleArchive(id: number) {
    if (!token) return;
    setError(null);
    try {
      const updated = await archiveProduct(token, id);
      setProducts((current) => current.map((product) => (product.id === id ? updated : product)));
    } catch (caught) {
      setError(caught instanceof CatalogError ? caught.message : tr("Archivage impossible."));
    }
  }

  if (sessionStatus === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{tr("Vérification de la session…")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{tr("Connectez-vous pour accéder aux produits.")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {tr("Se connecter")}
        </Link>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <BackofficeNav onLogout={handleLogout} />

      <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-ink">{tr("Produits")}</h1>
          <Button onClick={() => setShowForm((current) => !current)}>
            {showForm ? tr("Fermer") : tr("Nouveau produit")}
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
          <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-ink-soft">{tr("Aucun produit.")}</p>
        ) : (
          <div className="overflow-x-auto rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-4 font-medium">{tr("Produit")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("SKU")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Prix")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Stock")}</th>
                  <th className="py-2 pr-4 font-medium">{tr("Statut")}</th>
                  <th className="py-2 font-medium">{tr("Action")}</th>
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
                          setError(caught instanceof CatalogError ? caught.message : tr("Mise à jour impossible."));
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
                            <img
                              src={product.image_url}
                              alt=""
                              className="h-10 w-10 rounded-sm border border-line object-cover"
                            />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-dashed border-line text-[10px] text-ink-soft">
                              {tr("Aucune")}
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
                      <td className="py-3 pr-4 text-ink-soft">{tr(STATUS_LABEL[product.status])}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(product.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                          >
                            {tr("Modifier")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setGalleryId(galleryId === product.id ? null : product.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                          >
                            {tr("Photos (")}
                            {product.images?.length ?? 0})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTextsId(textsId === product.id ? null : product.id)}
                            className="rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
                          >
                            {tr("Textes")}
                          </button>
                          {product.status !== "archived" ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(product.id)}
                              className="rounded-sm border border-line px-2 py-1 text-xs text-danger transition-colors hover:border-danger"
                            >
                              {tr("Archiver")}
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
                  textsId === product.id ? (
                    <tr key={`texts-${product.id}`} className="border-b border-line bg-surface-raised">
                      <td colSpan={6} className="py-3 pr-4">
                        <TextsPanel
                          product={product}
                          onSave={async (patch) => {
                            if (!token) return;
                            setError(null);
                            try {
                              replaceProduct(await updateProduct(token, product.id, patch));
                              setTextsId(null);
                            } catch (caught) {
                              setError(caught instanceof CatalogError ? caught.message : tr("Mise à jour impossible."));
                            }
                          }}
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
  const { tr } = useAppearance();
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
      setFormError(tr("Tous les champs sont requis."));
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
      setFormError(caught instanceof CatalogError ? caught.message : tr("Création impossible."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-sm border border-line p-4 bg-surface shadow-card border-b-4 border-b-gold"
    >
      <label className="field">
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
        <span className="field-label">{tr("Catégorie")}</span>
      </label>

      <label className="field">
        <input
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder={tr("Samsung")}
          className="w-32 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        <span className="field-label">{tr("Marque")}</span>
      </label>

      <label className="field">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={tr("Galaxy A15")}
          className="w-48 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        <span className="field-label">{tr("Nom")}</span>
      </label>

      <label className="field">
        <input
          placeholder=" "
          type="number"
          min={0}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="w-28 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        <span className="field-label">{tr("Prix (F CFA)")}</span>
      </label>

      <label className="field">
        <input
          placeholder=" "
          type="number"
          min={0}
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          className="w-20 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        <span className="field-label">{tr("Stock")}</span>
      </label>

      <Button type="submit" disabled={submitting}>
        {tr("Créer")}
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
  const { tr } = useAppearance();
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
      <td className="py-2 pr-4 text-ink-soft">{tr(STATUS_LABEL[product.status])}</td>
      <td className="py-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
          >
            {tr("Enregistrer")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-line px-2 py-1 text-xs text-ink-soft transition-colors hover:border-gold"
          >
            {tr("Annuler")}
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
  const { tr } = useAppearance();
  const images = product.images ?? [];

  return (
    <div className="flex flex-wrap items-start gap-3">
      {images.map((image, index) => (
        <figure key={image.id} className="flex w-28 flex-col gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-28 w-28 rounded-sm border border-line object-cover" />
          {index === 0 ? (
            <figcaption className="text-xs font-medium text-gold">{tr("Couverture")}</figcaption>
          ) : (
            <button
              type="button"
              onClick={() => onCover(image.id)}
              className="text-left text-xs text-ink underline-offset-4 hover:text-gold hover:underline"
            >
              {tr("Définir comme couverture")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="text-left text-xs text-danger underline-offset-4 hover:underline"
          >
            {tr("Supprimer")}
          </button>
        </figure>
      ))}

      {images.length < MAX_GALLERY_IMAGES ? (
        <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line text-center text-xs text-ink-soft transition-colors hover:border-gold">
          {tr("+ Ajouter")}
          <span className="px-1 text-[10px]">{tr("JPG, PNG, WebP, 2 Mo")}</span>
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
        <p className="text-xs text-ink-soft">
          {tr("Galerie pleine (")}
          {MAX_GALLERY_IMAGES} {tr("photos).")}
        </p>
      )}
    </div>
  );
}

/** The product's descriptive texts: French (the reference) and the optional English wording. */
function TextsPanel({
  product,
  onSave,
}: {
  product: Product;
  onSave: (patch: { name_en: string; description: string; description_en: string }) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [nameEn, setNameEn] = useState(product.name_en ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [descriptionEn, setDescriptionEn] = useState(product.description_en ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await onSave({ name_en: nameEn.trim(), description: description.trim(), description_en: descriptionEn.trim() });
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-xs text-ink-soft">
        {tr("Le français est la référence. Sans texte anglais, la boutique en anglais affiche le texte français.")}
      </p>

      <label className="field">
        <input
          value={nameEn}
          onChange={(event) => setNameEn(event.target.value)}
          maxLength={255}
          placeholder=" "
          className="rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-gold focus:outline-none"
        />
        <span className="field-label">{tr("Nom en anglais")}</span>
      </label>

      <label className="field">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={5000}
          placeholder=" "
          className="rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-gold focus:outline-none"
        />
        <span className="field-label">{tr("Description (français)")}</span>
      </label>

      <label className="field">
        <textarea
          value={descriptionEn}
          onChange={(event) => setDescriptionEn(event.target.value)}
          rows={3}
          maxLength={5000}
          placeholder=" "
          className="rounded-sm border border-line bg-surface px-3 text-sm text-ink focus:border-gold focus:outline-none"
        />
        <span className="field-label">{tr("Description (anglais)")}</span>
      </label>

      <div>
        <Button type="submit" disabled={saving}>
          {tr("Enregistrer")}
        </Button>
      </div>
    </form>
  );
}
