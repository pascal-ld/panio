"use client";

import Link from "next/link";
import { AppLink } from "@/components/ui/AppLink";
import { ProductPhoto } from "@/components/product/ProductPhoto";
import { useEffect, useMemo, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import { formatPrice } from "@/lib/format";
import {
  fetchProducts,
  updateProductAvailability,
  type Product,
} from "@/lib/producteur-api";

type CategoryGroup = {
  id: number;
  name: string;
  products: Product[];
};

export default function ProducteurProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupProductsByCategory(products), [products]);

  async function handleToggleAvailability(product: Product) {
    setTogglingId(product.id);
    setError(null);
    try {
      const updated = await updateProductAvailability(product.id, !product.isAvailable);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-primary">Mes produits</h2>
        <div className="flex gap-2">
          <Link
            href="/producteur/categories"
            className="rounded-lg border border-primary/25 px-3 py-2 text-sm font-semibold text-primary"
          >
            Catégories
          </Link>
          <Link
            href="/producteur/produits/nouveau"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
          >
            Ajouter
          </Link>
        </div>
      </div>

      {loading && <PageLoader size="sm" />}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && products.length === 0 && (
        <section className="rounded-2xl border border-dashed border-primary/25 bg-white p-8 text-center">
          <p className="text-sm text-foreground/60">Aucun produit pour le moment.</p>
          <Link
            href="/producteur/produits/nouveau"
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            Ajouter votre premier produit
          </Link>
        </section>
      )}

      {!loading && !error && products.length > 0 && (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-primary-light">
                {group.name}
              </h3>
              <ul className="space-y-3">
                {group.products.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    toggling={togglingId === product.id}
                    onToggle={() => handleToggleAvailability(product)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductListItem({
  product,
  toggling,
  onToggle,
}: {
  product: Product;
  toggling: boolean;
  onToggle: () => void;
}) {
  const available = product.isAvailable !== false;

  return (
    <li
      className={`flex gap-3 rounded-2xl border p-3 shadow-sm transition ${
        available
          ? "border-primary/10 bg-white"
          : "border-primary/10 bg-foreground/[0.03] opacity-75"
      }`}
    >
      <ProductPhoto photoUrl={product.photoUrl} alt={product.name} size={80} className="bg-accent/60" />
      <div className="flex min-h-20 min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-semibold text-foreground">{product.name}</p>
          <div className="flex shrink-0 items-center gap-2">
            {!available && (
              <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground/60">
                Indisponible
              </span>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={available}
              aria-label={available ? "Rendre indisponible" : "Rendre disponible"}
              disabled={toggling}
              onClick={onToggle}
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
                available ? "bg-primary" : "bg-foreground/25"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                  available ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm font-medium text-primary">
          {formatPrice(product.priceFormatted ?? product.price)} / {product.saleUnitLabel}
        </p>
        <p className="text-xs text-foreground/50">Unité : {product.unit}</p>
        {product.nextSlotMaxQuantity != null && (
          <p className="mt-1.5">
            <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
              Limite prochain créneau : {product.nextSlotMaxQuantity}
            </span>
          </p>
        )}
        <div className="mt-auto flex justify-end pt-3">
          <AppLink
            href={`/producteur/produits/${product.id}`}
            className="inline-flex min-h-9 items-center rounded-lg border border-primary/25 px-3 text-sm font-semibold text-primary"
          >
            Modifier
          </AppLink>
        </div>
      </div>
    </li>
  );
}

function groupProductsByCategory(products: Product[]): CategoryGroup[] {
  const groups: CategoryGroup[] = [];

  for (const product of products) {
    const id = product.category?.id ?? 0;
    const name = product.category?.name ?? "Sans catégorie";
    let group = groups.find((g) => g.id === id);
    if (!group) {
      group = { id, name, products: [] };
      groups.push(group);
    }
    group.products.push(product);
  }

  return groups;
}
