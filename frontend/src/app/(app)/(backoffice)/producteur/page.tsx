"use client";

import { AppLink } from "@/components/ui/AppLink";
import { useAuth } from "@/contexts/AuthContext";

export default function ProducteurHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/15 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-primary">
          Bonjour{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">
          Gérez vos produits à vendre : ajoutez-les avec prix et photo, et organisez-les avec vos
          catégories.
        </p>
      </section>

      <AppLink
        href="/producteur/produits/nouveau"
        className="flex min-h-14 items-center justify-center rounded-2xl bg-primary px-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-primary-light"
      >
        Ajouter un produit
      </AppLink>

      <AppLink
        href="/producteur/produits"
        className="flex min-h-14 items-center justify-center rounded-2xl border border-primary/20 bg-white px-4 text-base font-semibold text-primary transition active:scale-[0.98] hover:bg-accent/50"
      >
        Voir mes produits
      </AppLink>

      <AppLink
        href="/producteur/commandes"
        className="flex min-h-14 items-center justify-center rounded-2xl border border-primary/20 bg-white px-4 text-base font-semibold text-primary transition active:scale-[0.98] hover:bg-accent/50"
      >
        Commandes à préparer
      </AppLink>

      <AppLink
        href="/producteur/recolte"
        className="flex min-h-14 items-center justify-center rounded-2xl border border-primary/20 bg-white px-4 text-base font-semibold text-primary transition active:scale-[0.98] hover:bg-accent/50"
      >
        Récolte
      </AppLink>

      <AppLink
        href="/producteur/categories"
        className="flex min-h-14 items-center justify-center rounded-2xl border border-primary/20 bg-white px-4 text-base font-semibold text-primary transition active:scale-[0.98] hover:bg-accent/50"
      >
        Mes catégories
      </AppLink>

      <AppLink
        href="/producteur/parametres"
        className="flex min-h-14 items-center justify-center rounded-2xl border border-primary/20 bg-white px-4 text-base font-semibold text-primary transition active:scale-[0.98] hover:bg-accent/50"
      >
        Paramètres producteur
      </AppLink>
    </div>
  );
}
