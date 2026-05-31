"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatDecimal, formatDecimalForApi } from "@/lib/format";
import {
  createProduct,
  fetchCategories,
  fetchSaleUnits,
  updateProduct,
  type Category,
  type Product,
  type SaleUnitOption,
  getPhotoUrl,
} from "@/lib/producteur-api";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-4 py-3.5 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "block text-sm font-medium text-foreground/80";

type ProductFormProps = {
  product?: Product;
};

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEdit = product != null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [saleUnits, setSaleUnits] = useState<SaleUnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    product?.category ? String(product.category.id) : "",
  );
  const [unit, setUnit] = useState(product?.unit ?? "");
  const [saleUnit, setSaleUnit] = useState(product?.saleUnit ?? "");
  const [price, setPrice] = useState(
    product ? formatDecimal(product.price) : "",
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [nextSlotMaxQuantity, setNextSlotMaxQuantity] = useState(
    product?.nextSlotMaxQuantity != null ? String(product.nextSlotMaxQuantity) : "",
  );
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchSaleUnits()])
      .then(([cats, units]) => {
        setCategories(cats);
        setSaleUnits(units);
        if (!isEdit && units[0]) {
          setSaleUnit(units[0].value);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isEdit]);

  useEffect(() => {
    if (!product) return;
    const url = getPhotoUrl(product.photoUrl);
    setPhotoPreview(url);
  }, [product]);

  function handlePhotoChange(file: File | null) {
    setError(null);

    if (!file || file.size === 0) {
      setPhoto(null);
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
      if (product) {
        setPhotoPreview(getPhotoUrl(product.photoUrl));
      } else {
        setPhotoPreview(null);
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("La photo ne doit pas dépasser 10 Mo.");
      return;
    }

    setPhoto(file);
    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      name: name.trim(),
      categoryId: categoryId ? Number(categoryId) : null,
      unit: unit.trim(),
      saleUnit,
      price: formatDecimalForApi(price),
      description: description.trim() || undefined,
      nextSlotMaxQuantity: nextSlotMaxQuantity !== "" ? Number(nextSlotMaxQuantity) : null,
      photo,
    };

    try {
      if (isEdit && product) {
        await updateProduct(product.id, payload);
      } else {
        await createProduct(payload);
      }
      router.push("/producteur/produits");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PageLoader size="sm" label="Chargement du formulaire…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      <p className="text-sm text-foreground/65">
        {isEdit
          ? "Modifiez les informations de votre produit."
          : "Décrivez votre produit. Les champs marqués d'un * sont obligatoires."}
      </p>

      <label className={labelClass}>
        Nom du produit *
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
          placeholder="Ex. Tomates cerises"
          autoComplete="off"
        />
      </label>

      <label className={labelClass}>
        Catégorie
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">Sans catégorie</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-foreground/50">
          <Link href="/producteur/categories" className="font-medium text-primary hover:underline">
            Gérer mes catégories
          </Link>
        </span>
      </label>

      <label className={labelClass}>
        Unité *
        <input
          type="text"
          required
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={inputClass}
          placeholder="Ex. 500 g, 1 botte, barquette 250 g"
        />
      </label>

      <label className={labelClass}>
        Unité de vente *
        <select
          required
          value={saleUnit}
          onChange={(e) => setSaleUnit(e.target.value)}
          className={inputClass}
        >
          {saleUnits.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Prix (€) *
        <input
          type="text"
          inputMode="decimal"
          lang="fr"
          required
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass}
          placeholder="Ex. 4,50"
        />
      </label>

      <label className={labelClass}>
        Description (optionnel)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} min-h-28 resize-y`}
          placeholder="Origine, variété, conseils de conservation…"
          rows={4}
        />
      </label>

      <label className={labelClass}>
        Stock max (prochaine date réservable)
        <input
          type="number"
          min={1}
          step={1}
          value={nextSlotMaxQuantity}
          onChange={(e) => setNextSlotMaxQuantity(e.target.value)}
          className={inputClass}
          placeholder="Optionnel (ex. 20)"
        />
        <span className="mt-1 block text-xs text-foreground/50">
          Cette limite s'applique uniquement au prochain créneau. Laissez vide pour ne pas limiter.
        </span>
      </label>

      <div>
        <span className={labelClass}>Photo</span>
        <input
          id="product-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(e) => {
            handlePhotoChange(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="product-photo"
          className="mt-1.5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/25 bg-white px-4 py-6 transition hover:border-primary/40 hover:bg-accent/30"
        >
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Aperçu"
              className="max-h-40 w-full rounded-lg object-contain"
            />
          ) : (
            <span className="text-center text-sm text-foreground/55">
              JPEG, PNG ou WebP — max. 10 Mo
              <br />
              <span className="text-xs">Compressée automatiquement pour le mobile</span>
            </span>
          )}
        </label>
        {photo && (
          <p className="mt-1 text-xs text-foreground/50">
            Fichier : {photo.name} ({(photo.size / 1024).toFixed(0)} Ko)
          </p>
        )}
        {isEdit && !photo && product?.photoUrl && (
          <p className="mt-1 text-xs text-foreground/50">
            La photo actuelle est conservée si vous n&apos;en choisissez pas une nouvelle.
          </p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="sticky bottom-20 z-30 flex min-h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
      >
        {submitting
          ? "Enregistrement…"
          : isEdit
            ? "Enregistrer les modifications"
            : "Enregistrer le produit"}
      </button>
    </form>
  );
}
