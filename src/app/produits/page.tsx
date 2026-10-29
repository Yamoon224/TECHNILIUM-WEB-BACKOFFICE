"use client";

import { QrLink } from "@/components/QrLink";
import { DataTable } from "@/components/DataTable";
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
  const [view, setView] = useState<"table" | "cards">("table");

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
          <h1 className="page-title font-display text-2xl font-semibold text-ink">{tr("Produits")}</h1>
          <Button onClick={() => setShowForm((current) => !current)}>
            {showForm ? tr("Fermer") : tr("Nouveau produit")}
          </Button>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex gap-2" role="group" aria-label={tr("Affichage")}>
          {(["table", "cards"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={`rounded-sm border px-3 py-1 text-xs transition-colors ${
                view === mode ? "border-gold text-gold" : "border-line text-ink hover:border-gold"
              }`}
            >
              {mode === "table" ? tr("Tableau") : tr("Cartes")}
            </button>
          ))}
        </div>

        {showForm ? (
          <NewProductForm
            categories={categories}
            onCreate={async ({ photo, ...input }) => {
              if (!token) return;
              let created = await createProduct(token, input);
              if (photo) {
                try {
                  created = await addProductImage(token, created.id, photo);
                } catch (caught) {
                  setError(
                    caught instanceof CatalogError
                      ? (caught.fieldErrors?.image?.[0] ?? caught.message)
                      : tr("Produit créé, mais l'envoi de la photo a échoué."),
                  );
                }
              }
              setProducts((current) => [created, ...current]);
              setShowForm(false);
            }}
          />
        ) : null}

        {loading ? (
          <p className="text-sm text-ink-soft">{tr("Chargement…")}</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-ink-soft">{tr("Aucun produit.")}</p>
        ) : view === "cards" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                editing={editingId === product.id}
                galleryOpen={galleryId === product.id}
                textsOpen={textsId === product.id}
                onEdit={() => setEditingId(product.id)}
                onCancelEdit={() => setEditingId(null)}
                onSave={async (patch) => {
                  if (!token) return;
                  try {
                    replaceProduct(await updateProduct(token, product.id, patch));
                    setEditingId(null);
                  } catch (caught) {
                    setError(caught instanceof CatalogError ? caught.message : tr("Mise à jour impossible."));
                  }
                }}
                onToggleGallery={() => setGalleryId(galleryId === product.id ? null : product.id)}
                onToggleTexts={() => setTextsId(textsId === product.id ? null : product.id)}
                onSaveTexts={async (patch) => {
                  if (!token) return;
                  setError(null);
                  try {
                    replaceProduct(await updateProduct(token, product.id, patch));
                    setTextsId(null);
                  } catch (caught) {
                    setError(caught instanceof CatalogError ? caught.message : tr("Mise à jour impossible."));
                  }
                }}
                onAddPhoto={(file) => handlePhoto(product, file)}
                onCover={(imageId) => handleCover(product, imageId)}
                onRemovePhoto={(imageId) => handleRemovePhoto(product, imageId)}
                onArchive={() => handleArchive(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
            <DataTable
  name="produits"
  rows={products}
  headers={[tr("Produit"), tr("SKU"), tr("Prix"), tr("Stock"), tr("Statut"), tr("Action")]}
  actionColumns={[5]}
  renderRow={(product) => [
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
                          <button
                            type="button"
                            title={tr("Modifier les photos")}
                            aria-label={tr("Modifier les photos")}
                            onClick={() => setGalleryId(galleryId === product.id ? null : product.id)}
                            className="shrink-0 rounded-sm transition-opacity hover:opacity-80"
                          >
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
                          </button>
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
                          {product.sku ? <QrLink kind="product" reference={product.sku} /> : null}
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
                ]}
/>
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
    photo: File | null;
  }) => Promise<void>;
}) {
  const { tr } = useAppearance();
  const [photo, setPhoto] = useState<File | null>(null);
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

    if (photo) {
      const problem = imageProblem(photo);
      if (problem) {
        setFormError(problem);
        return;
      }
    }

    setSubmitting(true);
    try {
      await onCreate({
        photo,
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
      setPhoto(null);
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
          placeholder="59000"
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
          placeholder="25"
          type="number"
          min={0}
          value={stock}
          onChange={(event) => setStock(event.target.value)}
          className="w-20 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink"
        />
        <span className="field-label">{tr("Stock")}</span>
      </label>

      <label className="flex cursor-pointer flex-col gap-1 text-xs text-ink-soft">
        {tr("Photo (optionnelle)")}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
          className="max-w-52 text-xs text-ink file:mr-2 file:rounded-sm file:border file:border-line file:bg-surface file:px-2 file:py-1 file:text-ink"
        />
      </label>

      <Button type="submit" disabled={submitting}>
        {tr("Créer")}
      </Button>

      {formError ? <p className="w-full text-sm text-danger">{formError}</p> : null}
    </form>
  );
}

function ProductCard({
  product,
  editing,
  galleryOpen,
  textsOpen,
  onEdit,
  onCancelEdit,
  onSave,
  onToggleGallery,
  onToggleTexts,
  onSaveTexts,
  onAddPhoto,
  onCover,
  onRemovePhoto,
  onArchive,
}: {
  product: Product;
  editing: boolean;
  galleryOpen: boolean;
  textsOpen: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: { brand: string; name: string; price_amount: number; stock_quantity: number }) => Promise<void>;
  onToggleGallery: () => void;
  onToggleTexts: () => void;
  onSaveTexts: (patch: { name_en: string; description: string; description_en: string }) => Promise<void>;
  onAddPhoto: (file: File | null) => void;
  onCover: (imageId: number) => void;
  onRemovePhoto: (imageId: number) => void;
  onArchive: () => void;
}) {
  const { tr } = useAppearance();
  const [brand, setBrand] = useState(product.brand);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price_amount ?? 0);
  const [stock, setStock] = useState(product.stock_quantity ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const inputClass = "w-full rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink";
  const buttonClass = "rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold";

  async function handleSave() {
    setSubmitting(true);
    try {
      await onSave({ brand: brand.trim(), name: name.trim(), price_amount: price, stock_quantity: stock });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="flex flex-col gap-3 rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
      <button
        type="button"
        title={tr("Modifier les photos")}
        aria-label={tr("Modifier les photos")}
        onClick={onToggleGallery}
        className="block overflow-hidden rounded-sm border border-line transition-opacity hover:opacity-80"
      >
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt="" className="aspect-square w-full object-cover" />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center text-xs text-ink-soft">
            {tr("Aucune")}
          </span>
        )}
      </button>

      {editing ? (
        <div className="flex flex-col gap-2">
          <input aria-label={tr("Marque")} value={brand} onChange={(event) => setBrand(event.target.value)} className={inputClass} />
          <input aria-label={tr("Nom du produit")} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          <div className="flex gap-2">
            <input
              aria-label={tr("Prix")}
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(Number(event.target.value))}
              className={inputClass}
            />
            <input
              aria-label={tr("Stock")}
              type="number"
              min={0}
              value={stock}
              onChange={(event) => setStock(Number(event.target.value))}
              className={inputClass}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-ink">
            {product.brand} {product.name}
          </h2>
          <p className="text-xs text-ink-soft">{product.sku ?? "—"}</p>
          <p className="text-sm text-ink">
            {product.price_amount?.toLocaleString("fr-FR") ?? "—"} {product.currency}
            <span className="text-ink-soft">
              {" "}
              · {tr("Stock")} {product.stock_quantity ?? "—"}
            </span>
          </p>
          <p className="text-xs text-ink-soft">{tr(STATUS_LABEL[product.status])}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <button
              type="button"
              disabled={submitting || !brand.trim() || !name.trim()}
              onClick={handleSave}
              className="rounded-sm border border-gold px-2 py-1 text-xs text-gold transition-colors disabled:opacity-50"
            >
              {tr("Enregistrer")}
            </button>
            <button type="button" onClick={onCancelEdit} className={buttonClass}>
              {tr("Annuler")}
            </button>
          </>
        ) : (
          <>
            {product.sku ? <QrLink kind="product" reference={product.sku} /> : null}
            <button type="button" onClick={onEdit} className={buttonClass}>
              {tr("Modifier")}
            </button>
            <button type="button" onClick={onToggleGallery} className={buttonClass}>
              {tr("Photos (")}
              {product.images?.length ?? 0})
            </button>
            <button type="button" onClick={onToggleTexts} className={buttonClass}>
              {tr("Textes")}
            </button>
            {product.status !== "archived" ? (
              <button
                type="button"
                onClick={onArchive}
                className="rounded-sm border border-line px-2 py-1 text-xs text-danger transition-colors hover:border-danger"
              >
                {tr("Archiver")}
              </button>
            ) : null}
          </>
        )}
      </div>

      {galleryOpen ? <Gallery product={product} onAdd={onAddPhoto} onCover={onCover} onRemove={onRemovePhoto} /> : null}
      {textsOpen ? <TextsPanel product={product} onSave={onSaveTexts} /> : null}
    </article>
  );
}

function EditProductRow({
  product,
  onSave,
  onCancel,
}: {
  product: Product;
  onSave: (patch: { brand: string; name: string; price_amount: number; stock_quantity: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const { tr } = useAppearance();
  const [brand, setBrand] = useState(product.brand);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price_amount ?? 0);
  const [stock, setStock] = useState(product.stock_quantity ?? 0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    try {
      await onSave({ brand: brand.trim(), name: name.trim(), price_amount: price, stock_quantity: stock });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <tr className="border-b border-line bg-surface-raised">
      <td className="py-2 pr-4 text-ink">
        <div className="flex flex-col gap-1">
          <input
            aria-label={tr("Marque")}
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
            className="w-full rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink"
          />
          <input
            aria-label={tr("Nom du produit")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-sm border border-line bg-surface px-2 py-1 text-sm text-ink"
          />
        </div>
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
            disabled={submitting || !brand.trim() || !name.trim()}
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
          placeholder={tr("Ex. 27-inch monitor")}
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
          placeholder={tr("Décrivez le produit en quelques lignes")}
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
          placeholder={tr("Describe the product in a few lines")}
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
