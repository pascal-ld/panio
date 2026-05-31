"use client";

import { useEffect, useState } from "react";
import { ProductPhoto } from "@/components/product/ProductPhoto";
import { formatMoneyLabel } from "@/lib/format";
import {
  createAssistedOrder,
  fetchAssistedContext,
  fetchAssistedClients,
  fetchOrderDates,
  fetchOrdersForDate,
  sendProducerBroadcast,
  updateOrderStatus,
  type AssistedContext,
  type AssistedClient,
  type AssistedProduct,
  type ProducteurOrder,
} from "@/lib/producteur-orders-api";

export default function ProducteurCommandesPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [orders, setOrders] = useState<ProducteurOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSaving, setBroadcastSaving] = useState(false);
  const [broadcastInfo, setBroadcastInfo] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [assistedOpen, setAssistedOpen] = useState(false);
  const [clients, setClients] = useState<AssistedClient[]>([]);
  const [clientsQuery, setClientsQuery] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [distributionPoints, setDistributionPoints] = useState<{ id: number; locationLabel: string }[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [products, setProducts] = useState<AssistedProduct[]>([]);
  const [assistedContextLoading, setAssistedContextLoading] = useState(false);
  const [isNextReservableDate, setIsNextReservableDate] = useState(false);
  const [assistedQuantities, setAssistedQuantities] = useState<Record<number, number>>({});
  const [assistedSaving, setAssistedSaving] = useState(false);
  const [assistedInfo, setAssistedInfo] = useState<string | null>(null);
  const [openOrders, setOpenOrders] = useState<Record<number, boolean>>({});
  const [producerComments, setProducerComments] = useState<Record<number, string>>({});
  const isSelectedDateTodayOrFuture = selectedDate !== "" && isTodayOrFuture(selectedDate);

  function syncComments(fetched: ProducteurOrder[]) {
    const next: Record<number, string> = {};
    for (const order of fetched) {
      next[order.id] = order.producerComment ?? "";
    }
    setProducerComments(next);
  }

  useEffect(() => {
    fetchOrderDates()
      .then((d) => {
        setDates(d);
        if (d.length > 0) setSelectedDate(d[d.length - 1]);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetchOrdersForDate(selectedDate)
      .then((fetched) => {
        setOrders(fetched);
        syncComments(fetched);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || !isSelectedDateTodayOrFuture) {
      setDistributionPoints([]);
      setProducts([]);
      setSelectedPointId(null);
      return;
    }

    setAssistedContextLoading(true);
    fetchAssistedContext(selectedDate)
      .then((context: AssistedContext) => {
        setDistributionPoints(context.distributionPoints);
        setProducts(context.products);
        setIsNextReservableDate(context.isNextReservableDate);
        setSelectedPointId((prev) =>
          prev && context.distributionPoints.some((point) => point.id === prev)
            ? prev
            : (context.distributionPoints[0]?.id ?? null),
        );
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setAssistedContextLoading(false));
  }, [selectedDate, isSelectedDateTodayOrFuture]);

  useEffect(() => {
    setClientsLoading(true);
    fetchAssistedClients(clientsQuery)
      .then((list) => {
        setClients(list);
        setSelectedClientId((prev) => prev ?? list[0]?.id ?? null);
      })
      .finally(() => setClientsLoading(false));
  }, [clientsQuery]);

  async function handleStatus(orderId: number, status: "prepared" | "retrieved") {
    setUpdatingId(orderId);
    setError(null);
    try {
      await updateOrderStatus(
        orderId,
        status,
        status === "prepared" ? (producerComments[orderId] ?? "").trim() : undefined,
      );
      if (selectedDate) {
        const refreshed = await fetchOrdersForDate(selectedDate);
        setOrders(refreshed);
        syncComments(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleBroadcast() {
    if (!selectedDate) return;
    const message = broadcastMessage.trim();
    if (message === "") {
      setError("Saisissez un message à envoyer aux clients.");
      return;
    }

    setBroadcastSaving(true);
    setError(null);
    setBroadcastInfo(null);
    try {
      const result = await sendProducerBroadcast(selectedDate, message);
      setBroadcastInfo(`Message envoyé à ${result.sentCount} client(s).`);
      setBroadcastMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du message");
    } finally {
      setBroadcastSaving(false);
    }
  }

  function setAssistedQuantity(productId: number, qty: number) {
    const nextQty = Math.max(0, Math.min(99, qty));
    setAssistedQuantities((prev) => {
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQty;
      }
      return next;
    });
  }

  async function handleCreateAssistedOrder() {
    if (!selectedDate || !selectedPointId) {
      setError("Choisissez la date et un lieu de distribution.");
      return;
    }

    const lines = Object.entries(assistedQuantities)
      .filter(([, q]) => q > 0)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity }));
    if (lines.length === 0) {
      setError("Ajoutez au moins un produit.");
      return;
    }

    const payload =
      clientMode === "existing"
        ? {
            clientId: selectedClientId ?? undefined,
            distributionPointId: selectedPointId,
            collectionDate: selectedDate,
            lines,
          }
        : {
            client: {
              fullName: newClientName.trim(),
              email: newClientEmail.trim(),
              phone: newClientPhone.trim(),
            },
            distributionPointId: selectedPointId,
            collectionDate: selectedDate,
            lines,
          };

    if (clientMode === "existing" && !payload.clientId) {
      setError("Sélectionnez un client.");
      return;
    }

    setAssistedSaving(true);
    setError(null);
    setAssistedInfo(null);
    try {
      await createAssistedOrder(payload);
      setAssistedInfo("Commande client créée et réservée.");
      setAssistedQuantities({});
      setAssistedOpen(false);
      if (selectedDate) {
        const refreshed = await fetchOrdersForDate(selectedDate);
        setOrders(refreshed);
        syncComments(refreshed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création de la commande client");
    } finally {
      setAssistedSaving(false);
    }
  }

  function toggleOrderDetails(orderId: number) {
    setOpenOrders((prev) => ({
      ...prev,
      [orderId]: !(prev[orderId] ?? false),
    }));
  }

  function toggleAllOrderDetails() {
    const areAllOpen = orders.length > 0 && orders.every((order) => openOrders[order.id] ?? false);
    if (areAllOpen) {
      setOpenOrders({});
      return;
    }

    const next: Record<number, boolean> = {};
    for (const order of orders) {
      next[order.id] = true;
    }
    setOpenOrders(next);
  }

  if (loading && dates.length === 0) {
    return <p className="text-sm text-foreground/60">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-primary">Commandes</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Commandes réservées et préparées par jour de collecte.
        </p>
      </div>

      <label className="block text-sm font-medium text-foreground">
        Jour de collecte
        <select
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-4 py-3"
        >
          {dates.length === 0 && <option value="">Aucune commande</option>}
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDateLabel(d)}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {broadcastInfo && (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm text-primary" role="status">
          {broadcastInfo}
        </p>
      )}
      {assistedInfo && (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm text-primary" role="status">
          {assistedInfo}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-foreground/60">Chargement des commandes…</p>
      ) : (
        <>
          {orders.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={toggleAllOrderDetails}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-white text-primary"
                aria-label={
                  orders.every((order) => openOrders[order.id] ?? false)
                    ? "Fermer tous les détails"
                    : "Ouvrir tous les détails"
                }
                title={
                  orders.every((order) => openOrders[order.id] ?? false)
                    ? "Tout fermer"
                    : "Tout ouvrir"
                }
              >
                {orders.every((order) => openOrders[order.id] ?? false) ? (
                  <ChevronUpIcon />
                ) : (
                  <ChevronDownIcon />
                )}
              </button>
            </div>
          )}
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                {(() => {
                  const isOpen = openOrders[order.id] ?? false;
                  return (
                    <>
              <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {order.client.fullName ?? order.client.email}
                    </p>
                    <p className="text-xs text-foreground/50">{order.client.email}</p>
                    {order.client.phone ? (
                      <a
                        href={phoneHref(order.client.phone)}
                        className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary"
                      >
                        <PhoneIcon />
                        {order.client.phone}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-foreground/40">Téléphone non renseigné</p>
                    )}
                    <p className="mt-1 text-sm text-foreground/70">
                      {order.distributionPoint?.locationLabel} · {formatMoneyLabel(order.totalFormatted)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-accent/80 px-2 py-1 text-xs font-semibold text-primary">
                    {order.statusLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleOrderDetails(order.id)}
                  className="mt-3 flex w-full items-center justify-between rounded-lg border border-primary/15 px-3 py-2 text-left text-sm font-medium text-primary"
                  aria-expanded={isOpen}
                >
                  <span>Détail produits</span>
                  <span className={`transition ${isOpen ? "rotate-180" : ""}`} aria-hidden>
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <>
                    <ul className="mt-3 space-y-1 text-sm text-foreground/80">
                      {order.lines.map((line, i) => (
                        <li key={i}>
                          {line.quantity} × {line.productName} ({line.saleUnitLabel})
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 border-t border-primary/15 pt-3 text-sm font-semibold text-foreground">
                      Total commande : {formatMoneyLabel(order.totalFormatted)}
                    </p>
                    {order.status === "reserved" && (
                      <label className="mt-3 block text-sm font-medium text-foreground/80">
                        Commentaire pour le client (optionnel)
                        <textarea
                          value={producerComments[order.id] ?? ""}
                          onChange={(e) =>
                            setProducerComments((prev) => ({ ...prev, [order.id]: e.target.value }))
                          }
                          maxLength={1000}
                          className="mt-1.5 min-h-20 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          placeholder="Ex. Pensez à apporter votre sac, je serai présent jusqu'à 18h."
                        />
                        <span className="mt-1 block text-xs text-foreground/50">
                          {(producerComments[order.id] ?? "").trim().length}/1000
                        </span>
                      </label>
                    )}
                  </>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.status === "reserved" && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleStatus(order.id, "prepared")}
                      className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Marquer préparée
                    </button>
                  )}
                  {(order.status === "prepared" || order.status === "absent") && (
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleStatus(order.id, "retrieved")}
                      className="min-h-10 rounded-lg border border-primary/25 px-4 text-sm font-semibold text-primary disabled:opacity-50"
                    >
                      {order.status === "absent" ? "Marquer récupérée (retard)" : "Marquer récupérée"}
                    </button>
                  )}
                </div>
                    </>
                  );
                })()}
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && orders.length === 0 && selectedDate && (
        <p className="text-center text-sm text-foreground/55">Aucune commande pour ce jour.</p>
      )}

      {!loading && selectedDate && isSelectedDateTodayOrFuture && (
        <section className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setAssistedOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={assistedOpen}
          >
            <span className="font-semibold text-primary">Créer une commande client</span>
            <span className={`text-primary transition ${assistedOpen ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </button>
          {assistedOpen && (
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    clientMode === "existing" ? "bg-primary text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  Client existant
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    clientMode === "new" ? "bg-primary text-white" : "bg-primary/10 text-primary"
                  }`}
                >
                  Nouveau client
                </button>
              </div>

              {clientMode === "existing" ? (
                <>
                  <label className="block text-sm font-medium text-foreground/80">
                    Rechercher un client
                    <input
                      type="text"
                      value={clientsQuery}
                      onChange={(e) => setClientsQuery(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm"
                      placeholder="Nom, e-mail, téléphone"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground/80">
                    Client
                    <select
                      value={selectedClientId ?? ""}
                      onChange={(e) => setSelectedClientId(Number.parseInt(e.target.value, 10) || null)}
                      className="mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm"
                    >
                      {clientsLoading && <option value="">Chargement…</option>}
                      {!clientsLoading && clients.length === 0 && <option value="">Aucun client</option>}
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {(client.fullName ?? "Client")} - {client.email}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-foreground/80 sm:col-span-2">
                    Nom client *
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground/80">
                    E-mail *
                    <input
                      type="email"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-foreground/80">
                    Téléphone
                    <input
                      type="tel"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              )}

              <label className="block text-sm font-medium text-foreground/80">
                Lieu de distribution
                <select
                  value={selectedPointId ?? ""}
                  onChange={(e) => setSelectedPointId(Number.parseInt(e.target.value, 10) || null)}
                  className="mt-1.5 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm"
                >
                  {assistedContextLoading && <option value="">Chargement…</option>}
                  {distributionPoints.length === 0 && <option value="">Aucun lieu</option>}
                  {distributionPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.locationLabel}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground/80">Produits</p>
                {products.length === 0 && (
                  <p className="rounded-lg border border-dashed border-primary/15 px-3 py-3 text-sm text-foreground/55">
                    Aucun produit disponible pour ce créneau.
                  </p>
                )}
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-primary/10 p-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ProductPhoto photoUrl={product.photoUrl} alt={product.name} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="block text-xs text-foreground/60">
                          {product.saleUnitLabel} · {formatMoneyLabel(product.priceFormatted)}
                        </span>
                        {isNextReservableDate && product.isSoldOut && (
                          <span className="mt-0.5 block text-xs font-medium text-red-700">Rupture de stock</span>
                        )}
                        {isNextReservableDate &&
                          !product.isSoldOut &&
                          product.nextSlotRemainingQuantity !== null &&
                          product.nextSlotRemainingQuantity < 3 && (
                            <span className="mt-0.5 block text-xs font-medium text-amber-700">
                              Plus que {product.nextSlotRemainingQuantity} restant(s)
                            </span>
                          )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-center">
                      <button
                        type="button"
                        onClick={() => setAssistedQuantity(product.id, (assistedQuantities[product.id] ?? 0) - 1)}
                        disabled={product.isSoldOut}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 text-xl font-bold text-primary disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={assistedQuantities[product.id] ?? 0}
                        onChange={(e) => setAssistedQuantity(product.id, Number.parseInt(e.target.value, 10) || 0)}
                        disabled={product.isSoldOut}
                        className="h-10 w-14 rounded-lg border border-primary/20 text-center text-base font-semibold disabled:bg-foreground/5 disabled:text-foreground/40"
                      />
                      <button
                        type="button"
                        onClick={() => setAssistedQuantity(product.id, (assistedQuantities[product.id] ?? 0) + 1)}
                        disabled={product.isSoldOut}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 text-xl font-bold text-primary disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleCreateAssistedOrder}
                disabled={assistedSaving || selectedPointId === null}
                className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {assistedSaving ? "Création…" : "Créer la commande client"}
              </button>
            </div>
          )}
        </section>
      )}

      {!loading && selectedDate && (
        <section className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setBroadcastOpen((prev) => !prev)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={broadcastOpen}
          >
            <span className="font-semibold text-primary">Message global clients</span>
            <span className={`text-primary transition ${broadcastOpen ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </button>
          {broadcastOpen && (
            <>
              <p className="mt-2 text-sm text-foreground/65">
                Le producteur envoie un message concernant la livraison du {formatDateLabel(selectedDate)}.
              </p>
              <label className="mt-3 block text-sm font-medium text-foreground/80">
                Message à envoyer
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  maxLength={1500}
                  className="mt-1.5 min-h-24 w-full rounded-xl border border-primary/20 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex. Petit retard ce matin, merci de passer à partir de 11h."
                />
                <span className="mt-1 block text-xs text-foreground/50">
                  {broadcastMessage.trim().length}/1500
                </span>
              </label>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={broadcastSaving || broadcastMessage.trim() === ""}
                className="mt-3 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {broadcastSaving ? "Envoi…" : "Envoyer à tous les clients du jour"}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832l-3.71 3.94a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

function PhoneIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function isTodayOrFuture(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) {
    return false;
  }

  const selected = new Date(y, m - 1, d);
  selected.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selected >= today;
}
