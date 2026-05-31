"use client";

import { useEffect, useState } from "react";
import { OrderCard } from "@/components/client/OrderCard";
import { AppLink } from "@/components/ui/AppLink";
import { PageLoader } from "@/components/ui/PageLoader";
import { fetchClientOrders, type ClientOrder } from "@/lib/client-api";

export default function ClientCommandesPage() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientOrders("active")
      .then(setOrders)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-primary">Mes commandes</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Brouillons, réservations et commandes en préparation.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <PageLoader size="sm" />
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-foreground/55">
          Aucune commande en cours.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                expandable
                standHref={
                  order.producer?.slug ? `/producteur/${order.producer.slug}` : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      <p className="pt-2 text-center">
        <AppLink
          href="/client/historique"
          className="text-xs text-foreground/45 underline-offset-2 hover:text-foreground/65 hover:underline"
        >
          Historique des commandes passées
        </AppLink>
      </p>
    </div>
  );
}
