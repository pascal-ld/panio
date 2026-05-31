"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductForm } from "@/components/producteur/ProductForm";
import { AppLink } from "@/components/ui/AppLink";
import { PageLoader } from "@/components/ui/PageLoader";
import { fetchProduct, type Product } from "@/lib/producteur-api";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || Number.isNaN(productId)) {
      setError("Produit introuvable.");
      setLoading(false);
      return;
    }

    fetchProduct(productId)
      .then(setProduct)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return <PageLoader size="sm" />;
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700" role="alert">
          {error ?? "Produit introuvable."}
        </p>
        <Link href="/producteur/produits" className="text-sm font-semibold text-primary underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-primary">Modifier le produit</h2>
          <p className="mt-1 truncate text-sm text-foreground/65">{product.name}</p>
        </div>
        <AppLink
          href="/producteur/produits"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-primary"
        >
          Annuler
        </AppLink>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
