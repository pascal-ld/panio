"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  fetchAdminClientOrders,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/lib/admin-api";
import { formatMoneyLabel } from "@/lib/format";

const inputClass =
  "rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const buttonPrimaryClass =
  "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-50";
const buttonSecondaryClass =
  "rounded-xl border border-primary/20 px-4 py-2 text-sm font-medium text-foreground/70 transition hover:bg-accent";

const statusOptions: { value: AdminOrderStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "reserved", label: "Réservée" },
  { value: "prepared", label: "Préparée" },
  { value: "retrieved", label: "Récupérée" },
  { value: "cancelled", label: "Annulée" },
  { value: "absent", label: "Absent" },
];

export default function AdminClientOrdersPage() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<number, AdminOrderStatus>>({});

  async function loadOrders() {
    const data = await fetchAdminClientOrders(clientId);
    setClientName(data.client.fullName ?? data.client.email);
    setClientEmail(data.client.email);
    setOrders(data.orders);
    setPendingStatus(
      Object.fromEntries(data.orders.map((order) => [order.id, order.status as AdminOrderStatus])),
    );
  }

  useEffect(() => {
    if (!Number.isFinite(clientId)) {
      setError("Client invalide.");
      setLoading(false);
      return;
    }

    loadOrders()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  async function handleStatusChange(orderId: number) {
    const status = pendingStatus[orderId];
    if (!status) return;

    setUpdatingId(orderId);
    setError(null);
    try {
      const updated = await updateAdminOrderStatus(orderId, status);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/utilisateurs" className="text-sm font-medium text-primary hover:underline">
          ← Utilisateurs
        </Link>
        <h2 className="mt-2 text-xl font-bold text-primary">Commandes client</h2>
        <p className="mt-1 text-sm text-foreground/65">
          {clientName}
          {clientEmail !== clientName ? ` · ${clientEmail}` : ""}
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <PageLoader size="sm" />
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-primary/20 p-6 text-center text-sm text-foreground/55">
          Aucune commande pour ce client.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary">
                    {order.collectionDateLabel ?? order.collectionDate ?? "Date inconnue"}
                  </p>
                  <p className="text-sm text-foreground/65">
                    {order.producer?.fullName ?? "Producteur inconnu"}
                    {order.distributionPoint ? ` · ${order.distributionPoint.locationLabel}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground/80">
                    Total : {formatMoneyLabel(order.totalFormatted)}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-accent/80 px-2 py-1 text-xs font-semibold text-primary">
                  {order.statusLabel}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-sm text-foreground/75">
                {order.lines.map((line, index) => (
                  <li key={index}>
                    {line.quantity} × {line.productName}
                    {line.saleUnitLabel ? ` (${line.saleUnitLabel})` : ""}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary/10 pt-3">
                <select
                  value={pendingStatus[order.id] ?? order.status}
                  onChange={(event) =>
                    setPendingStatus((prev) => ({
                      ...prev,
                      [order.id]: event.target.value as AdminOrderStatus,
                    }))
                  }
                  className={inputClass}
                  aria-label={`Statut commande ${order.id}`}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={
                    updatingId === order.id ||
                    (pendingStatus[order.id] ?? order.status) === order.status
                  }
                  onClick={() => handleStatusChange(order.id)}
                  className={buttonPrimaryClass}
                >
                  {updatingId === order.id ? "…" : "Appliquer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
