"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderCard } from "@/components/client/OrderCard";
import { fetchClientOrders, type ClientOrder } from "@/lib/client-api";

export default function ClientHistoriquePage() {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientOrders("history")
      .then(setOrders)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-primary">Historique</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Commandes récupérées, annulées ou marquées absentes. Cliquez sur une commande pour
          voir le détail.
        </p>
      </div>

      <Link href="/client/commandes" className="text-sm font-medium text-primary underline">
        ← Commandes en cours
      </Link>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-foreground/60">Chargement…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-foreground/55">
          Aucune commande passée pour l&apos;instant.
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
    </div>
  );
}
