"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderCard } from "@/components/client/OrderCard";
import { OrganicBadge } from "@/components/producer/OrganicBadge";
import { AppLink } from "@/components/ui/AppLink";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  fetchClientOrders,
  fetchClientPreferences,
  removeFavoriteProducer,
  type ClientOrder,
  type ProducerSummary,
} from "@/lib/client-api";

export default function ClientHomePage() {
  const [favorites, setFavorites] = useState<ProducerSummary[]>([]);
  const [activeOrders, setActiveOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingSlug, setRemovingSlug] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchClientPreferences(), fetchClientOrders("active")])
      .then(([prefs, orders]) => {
        setFavorites(prefs.favoriteProducers);
        setActiveOrders(orders);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemoveFavorite(slug: string) {
    setRemovingSlug(slug);
    setError(null);
    try {
      const result = await removeFavoriteProducer(slug);
      setFavorites(result.favoriteProducers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setRemovingSlug(null);
    }
  }

  if (loading) {
    return <PageLoader size="sm" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Accueil</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Vos commandes et vos producteurs favoris.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold text-primary">Mes producteurs favoris</h3>
        {favorites.length > 0 ? (
          <ul className="space-y-3">
            {favorites.map((favorite) => (
              <li
                key={favorite.id}
                className="rounded-2xl border border-primary/25 bg-accent/50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-primary">{favorite.fullName}</p>
                  {favorite.producerOrganic && <OrganicBadge />}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AppLink
                    href={`/producteur/${favorite.slug}`}
                    className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-white"
                  >
                    Ouvrir le stand
                  </AppLink>
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(favorite.slug)}
                    disabled={removingSlug === favorite.slug}
                    className="inline-flex min-h-11 items-center rounded-xl border border-primary/25 px-5 text-sm font-semibold text-primary disabled:opacity-50"
                  >
                    {removingSlug === favorite.slug ? "…" : "Retirer des favoris"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary/20 p-4">
            <p className="text-sm text-foreground/65">
              Ajoutez des producteurs favoris pour y accéder rapidement.
            </p>
            <AppLink
              href="/client/producteurs"
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-primary/25 px-5 font-semibold text-primary"
            >
              Choisir des producteurs
            </AppLink>
          </div>
        )}
        <Link href="/client/producteurs" className="text-sm text-primary underline">
          Voir tous les producteurs →
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">Commandes en cours</h3>
          <AppLink href="/client/commandes" className="text-sm text-primary underline">
            Tout voir
          </AppLink>
        </div>
        {activeOrders.length === 0 ? (
          <p className="text-sm text-foreground/55">Aucune commande en cours.</p>
        ) : (
          <ul className="space-y-2">
            {activeOrders.slice(0, 3).map((order) => (
              <li key={order.id}>
                <OrderCard
                  order={order}
                  expandable
                  standHref={
                    order.producer?.slug
                      ? `/producteur/${order.producer.slug}`
                      : undefined
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
