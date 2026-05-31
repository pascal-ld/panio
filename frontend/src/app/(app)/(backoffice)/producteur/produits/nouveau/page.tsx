"use client";

import { ProductForm } from "@/components/producteur/ProductForm";
import { AppLink } from "@/components/ui/AppLink";

export default function NewProductPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-primary">Nouveau produit</h2>
        <AppLink
          href="/producteur/produits"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-primary"
        >
          Annuler
        </AppLink>
      </div>
      <ProductForm />
    </div>
  );
}
