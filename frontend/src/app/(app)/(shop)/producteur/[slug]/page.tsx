"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientGuard } from "@/components/auth/ClientGuard";
import { AppLink } from "@/components/ui/AppLink";
import { PageLoader } from "@/components/ui/PageLoader";
import {
  addFavoriteProducer,
  cancelOrder,
  fetchActiveOrder,
  fetchClientPreferences,
  fetchShop,
  orderSlotKey,
  removeFavoriteProducer,
  saveOrder,
  type ClientOrder,
  type CollectionSlot,
  type OrderLine,
  type ShopData,
  type ShopProduct,
} from "@/lib/client-api";
import { OrganicBadge } from "@/components/producer/OrganicBadge";
import { ProducerPhoto } from "@/components/producer/ProducerPhoto";
import { ProductPhoto } from "@/components/product/ProductPhoto";
import { formatMoneyLabel } from "@/lib/format";

type SlotEntry = {
  key: string;
  slot: CollectionSlot;
  order: ClientOrder | undefined;
};

type ProductCategoryGroup = {
  key: string;
  label: string;
  products: ShopProduct[];
};

export default function ProducteurPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [myOrders, setMyOrders] = useState<ClientOrder[]>([]);

  useEffect(() => {
    if (!slug) return;
    Promise.all([fetchShop(slug), fetchClientPreferences()])
      .then(([data, prefs]) => {
        setShop(data);
        setMyOrders(data.myOrders ?? []);
        setIsFavorite(prefs.favoriteProducers.some((p) => p.slug === slug));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const ordersBySlot = useMemo(() => {
    const map = new Map<string, ClientOrder>();
    for (const o of myOrders) {
      map.set(orderSlotKey(o), o);
    }
    return map;
  }, [myOrders]);

  const slotEntries = useMemo((): SlotEntry[] => {
    if (!shop) return [];

    const byKey = new Map<string, SlotEntry>();
    for (const slot of shop.collectionSlots) {
      const key = slotKey(slot);
      byKey.set(key, { key, slot, order: ordersBySlot.get(key) });
    }

    for (const o of myOrders) {
      const key = orderSlotKey(o);
      if (byKey.has(key)) continue;
      byKey.set(key, {
        key,
        slot: orderToSyntheticSlot(o),
        order: o,
      });
    }

    return [...byKey.values()].sort((a, b) => a.slot.date.localeCompare(b.slot.date));
  }, [shop, myOrders, ordersBySlot]);

  const selectedSlot = useMemo(() => {
    if (!selectedSlotKey) return null;
    return slotEntries.find((e) => e.key === selectedSlotKey)?.slot ?? null;
  }, [slotEntries, selectedSlotKey]);

  const loadActiveOrder = useCallback(async () => {
    if (!slug || !selectedSlot) return;
    setOrderLoading(true);
    try {
      const { order: active } = await fetchActiveOrder(
        slug,
        selectedSlot.date,
        selectedSlot.distributionPointId,
      );
      setOrder(active);
      if (active) {
        const next: Record<number, number> = {};
        for (const line of active.lines) {
          if (line.productId) next[line.productId] = line.quantity;
        }
        setQuantities(next);
      } else {
        setQuantities({});
      }
    } catch {
      setOrder(null);
      setQuantities({});
    } finally {
      setOrderLoading(false);
    }
  }, [slug, selectedSlot]);

  useEffect(() => {
    if (selectedSlot) void loadActiveOrder();
    else {
      setOrder(null);
      setQuantities({});
      setOrderLoading(false);
    }
  }, [selectedSlot, loadActiveOrder]);

  const cartCount = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + (q > 0 ? q : 0), 0),
    [quantities],
  );

  function slotKey(slot: CollectionSlot): string {
    return `${slot.date}-${slot.distributionPointId}`;
  }

  function setQuantity(productId: number, value: number) {
    const qty = Math.max(0, Math.min(99, value));
    setQuantities((prev) => {
      const next = { ...prev };
      if (qty === 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }

  function buildLines() {
    return Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([id, quantity]) => ({ productId: Number(id), quantity }));
  }

  function selectSlot(key: string) {
    setSelectedSlotKey((prev) => (prev === key ? null : key));
  }

  async function handleSave(reserve: boolean) {
    if (!slug || !selectedSlot) {
      setError("Choisissez un jour de collecte.");
      return;
    }
    if (buildLines().length === 0) {
      setError("Ajoutez au moins un produit.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveOrder({
        producerSlug: slug,
        collectionDate: selectedSlot.date,
        distributionPointId: selectedSlot.distributionPointId,
        lines: buildLines(),
        reserve,
      });
      setOrder(saved);
      setMyOrders((prev) => {
        const rest = prev.filter((o) => o.id !== saved.id);
        return [saved, ...rest];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!order || !window.confirm("Annuler cette commande ?")) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await cancelOrder(order.id);
      setOrder(updated);
      setQuantities({});
      setMyOrders((prev) => prev.filter((o) => o.id !== updated.id || updated.status !== "cancelled"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleFavorite() {
    if (!slug) return;
    try {
      if (isFavorite) {
        const result = await removeFavoriteProducer(slug);
        setIsFavorite(result.favoriteProducers.some((p) => p.slug === slug));
      } else {
        const result = await addFavoriteProducer(slug);
        setIsFavorite(result.favoriteProducers.some((p) => p.slug === slug));
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <ClientGuard>
        <div className="flex min-h-dvh items-center justify-center">
          <PageLoader label="Chargement du stand…" />
        </div>
      </ClientGuard>
    );
  }

  if (!shop) {
    return (
      <ClientGuard>
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
          <p className="text-red-700">{error ?? "Producteur introuvable"}</p>
          <AppLink href="/client" className="text-primary underline">
            Retour
          </AppLink>
        </div>
      </ClientGuard>
    );
  }

  const isReserved = order?.status === "reserved";
  const isDraft = order?.status === "draft";
  const producerDescription = shop.producer.producerDescription?.trim() ?? "";

  return (
    <ClientGuard>
      <div className="min-h-dvh bg-background pb-8">
        <header className="sticky top-0 z-40 border-b border-primary/10 bg-white/95 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <ProducerPhoto
              photoPath={shop.producer.producerPhotoPath}
              alt={shop.producer.fullName ?? "Producteur"}
              size={48}
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate font-semibold text-primary">{shop.producer.fullName}</p>
                {shop.producer.producerOrganic && <OrganicBadge />}
                {isFavorite && (
                  <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                    Favori
                  </span>
                )}
              </div>
            </div>
            <AppLink href="/client" className="shrink-0 text-sm text-primary">
              Retour
            </AppLink>
          </div>
        </header>

        <main className="mx-auto max-w-lg space-y-6 px-4 pt-4">
          {producerDescription !== "" && (
            <p className="text-sm leading-relaxed text-foreground/75">{producerDescription}</p>
          )}

          <button
            type="button"
            onClick={handleToggleFavorite}
            className="text-sm text-primary underline"
          >
            {isFavorite ? "Retirer des favoris" : "Mettre en favori"}
          </button>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-primary">Jours de collecte</h2>
              <p className="mt-1 text-sm text-foreground/60">
                Cliquez sur un jour pour voir ou modifier votre commande.
              </p>
            </div>

            {slotEntries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-primary/20 p-4 text-sm text-foreground/55">
                Aucun créneau disponible pour le moment.
              </p>
            ) : (
              <ul className="space-y-2">
                {slotEntries.map(({ key, slot, order: slotOrder }) => {
                  const isOpen = selectedSlotKey === key;
                  const slotCanEdit = resolveCanEdit(isOpen ? order : null, slotOrder);
                  return (
                    <CollectionDayCard
                      key={key}
                      slot={slot}
                      slotOrder={slotOrder}
                      selected={isOpen}
                      onToggle={() => selectSlot(key)}
                      shop={shop}
                      quantities={isOpen ? quantities : {}}
                      canEdit={isOpen && slotCanEdit}
                      orderLoading={isOpen && orderLoading}
                      onQuantityChange={setQuantity}
                      cartCount={isOpen ? cartCount : 0}
                      liveOrder={isOpen ? order : null}
                      saving={saving}
                      isReserved={isOpen && isReserved}
                      isDraft={isOpen && isDraft}
                      onSaveDraft={() => handleSave(false)}
                      onSaveReserve={() => handleSave(true)}
                      onCancel={handleCancel}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          <CollectionSlotsLegend />
        </main>
      </div>
    </ClientGuard>
  );
}

function CollectionSlotsLegend() {
  return (
    <section
      className="rounded-xl border border-primary/10 bg-white/80 px-4 py-3 text-sm text-foreground/65"
      aria-label="Légende des couleurs"
    >
      <p className="font-medium text-foreground/80">Légende</p>
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded border border-primary/15 bg-white" aria-hidden />
          Pas de commande
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded border border-amber-200 bg-amber-50" aria-hidden />
          Brouillon
        </li>
        <li className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded border border-green-200 bg-green-50" aria-hidden />
          Commande réservée
        </li>
        <li className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded border border-primary ring-2 ring-primary/30 bg-white"
            aria-hidden
          />
          Jour sélectionné
        </li>
      </ul>
    </section>
  );
}

function resolveCanEdit(liveOrder: ClientOrder | null, slotOrder: ClientOrder | undefined): boolean {
  if (liveOrder !== null) return liveOrder.canEdit;
  if (slotOrder !== undefined) return slotOrder.canEdit;
  return true;
}

function slotBackground(order: ClientOrder | undefined, selected: boolean): string {
  if (selected) {
    return order
      ? "border-primary ring-2 ring-primary/30 bg-green-50"
      : "border-primary ring-2 ring-primary/30 bg-white";
  }
  if (!order) return "border-primary/15 bg-white";
  if (order.status === "draft") return "border-amber-200 bg-amber-50";
  return "border-green-200 bg-green-50";
}

function CollectionDayCard({
  slot,
  slotOrder,
  selected,
  onToggle,
  shop,
  quantities,
  canEdit,
  onQuantityChange,
  orderLoading,
  cartCount,
  liveOrder,
  saving,
  isReserved,
  isDraft,
  onSaveDraft,
  onSaveReserve,
  onCancel,
}: {
  slot: CollectionSlot;
  slotOrder: ClientOrder | undefined;
  selected: boolean;
  onToggle: () => void;
  shop: ShopData;
  quantities: Record<number, number>;
  canEdit: boolean;
  orderLoading: boolean;
  onQuantityChange: (productId: number, qty: number) => void;
  cartCount: number;
  liveOrder: ClientOrder | null;
  saving: boolean;
  isReserved: boolean;
  isDraft: boolean;
  onSaveDraft: () => void;
  onSaveReserve: () => void;
  onCancel: () => void;
}) {
  const displayOrder = liveOrder ?? slotOrder;
  const canCancel = liveOrder?.canCancel ?? slotOrder?.canCancel ?? false;
  const showLoading = orderLoading && !displayOrder;
  const isNextReservableSlot = shop.nextReservableDate === slot.date;
  const productsForSlot = useMemo(
    () =>
      shop.products.filter(
        (product) =>
          !isNextReservableSlot ||
          product.nextSlotRemainingQuantity === null ||
          product.nextSlotRemainingQuantity > 0,
      ),
    [shop.products, isNextReservableSlot],
  );
  const groupedProducts = useMemo(() => groupProductsByCategory(productsForSlot), [productsForSlot]);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenCategories((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of groupedProducts) {
        next[group.key] = prev[group.key] ?? true;
      }
      return next;
    });
  }, [groupedProducts]);

  function toggleCategory(groupKey: string) {
    setOpenCategories((prev) => ({
      ...prev,
      [groupKey]: !(prev[groupKey] ?? true),
    }));
  }

  return (
    <li className={`overflow-hidden rounded-xl border ${slotBackground(slotOrder, selected)}`}>
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-foreground">{slot.dateLabel}</p>
            <p className="text-sm text-foreground/70">{slot.locationLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {slotOrder && (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                  slotOrder.status === "draft"
                    ? "bg-amber-200 text-amber-900"
                    : "bg-green-600 text-white"
                }`}
              >
                {slotOrder.statusLabel}
              </span>
            )}
            <span
              className={`text-primary transition ${selected ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▾
            </span>
          </div>
        </div>
        <p className="mt-1 text-xs text-foreground/50">
          Commande avant {slot.orderDeadlineLabel}
          {slotOrder ? ` · ${formatMoneyLabel(slotOrder.totalFormatted)}` : ""}
        </p>
      </button>

      {selected && (
        <div className="border-t border-primary/10 bg-white/90 px-4 pb-4 pt-3">
          {showLoading ? (
            <p className="py-4 text-center text-sm text-foreground/55">Chargement…</p>
          ) : canEdit ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {displayOrder ? "Modifier les quantités" : "Choisir des produits"}
              </p>
              <div className="space-y-3">
                {groupedProducts.map((group) => {
                  const isOpen = openCategories[group.key] ?? true;
                  return (
                    <section key={group.key} className="rounded-xl border border-primary/10 bg-white">
                      <button
                        type="button"
                        onClick={() => toggleCategory(group.key)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                      >
                        <span className="text-sm font-semibold text-primary">
                          {group.label} ({group.products.length})
                        </span>
                        <span className={`text-primary transition ${isOpen ? "rotate-180" : ""}`}>
                          ▾
                        </span>
                      </button>
                      {isOpen && (
                        <ul className="space-y-2 border-t border-primary/10 p-2">
                          {group.products.map((product) => (
                            <ProductRow
                              key={product.id}
                              product={product}
                              quantity={quantities[product.id] ?? 0}
                              onChange={(q) => onQuantityChange(product.id, q)}
                              stockHint={resolveStockHint(product, isNextReservableSlot)}
                              compact
                            />
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>
              {groupedProducts.length === 0 && (
                <p className="rounded-xl border border-dashed border-primary/15 px-3 py-3 text-sm text-foreground/55">
                  Tous les produits sont épuisés pour ce prochain créneau.
                </p>
              )}

              <div className="mt-4 space-y-2 border-t border-primary/15 pt-4">
                <p className="text-sm font-medium text-foreground">
                    {cartCount > 0
                      ? `${cartCount} article(s)${liveOrder ? ` · ${formatMoneyLabel(liveOrder.totalFormatted)}` : ""}`
                      : "Panier vide"}
                  </p>
                  {cartCount > 0 && (
                    <div className="flex flex-col gap-2">
                      {(isDraft || !liveOrder) && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={onSaveDraft}
                          className="min-h-11 rounded-xl border border-primary/25 font-semibold text-primary disabled:opacity-50"
                        >
                          Enregistrer le brouillon
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={onSaveReserve}
                        className="min-h-12 rounded-xl bg-primary font-semibold text-white disabled:opacity-50"
                      >
                        {saving ? "…" : isReserved ? "Mettre à jour la commande" : "Réserver la commande"}
                      </button>
                    </div>
                  )}
                  {canCancel && (isReserved || isDraft) && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={onCancel}
                      className="w-full text-sm text-red-700 underline disabled:opacity-50"
                    >
                      Annuler la commande
                    </button>
                  )}
                </div>
            </>
          ) : displayOrder && displayOrder.lines.some((l) => l.quantity > 0) ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Produits commandés
              </p>
              <ul className="space-y-3">
                {displayOrder.lines
                  .filter((line) => line.quantity > 0)
                  .map((line) => (
                    <ProductRow
                      key={`${line.productId}-${line.productName}`}
                      product={lineToProduct(line, shop)}
                      quantity={line.quantity}
                      readOnly
                      compact
                    />
                  ))}
              </ul>
              <p className="mt-4 border-t border-primary/15 pt-3 text-sm font-medium text-foreground">
                {displayOrder.lines.reduce((n, l) => n + l.quantity, 0)} article(s) ·{" "}
                {formatMoneyLabel(displayOrder.totalFormatted)}
              </p>
            </>
          ) : (
            <p className="text-sm text-foreground/55">Aucun produit sélectionné pour ce jour.</p>
          )}
        </div>
      )}
    </li>
  );
}

function lineToProduct(line: OrderLine, shop: ShopData): ShopProduct {
  const fromShop = shop.products.find((p) => p.id === line.productId);
  if (fromShop) return fromShop;

  return {
    id: line.productId,
    name: line.productName,
    description: null,
    unit: line.saleUnitLabel,
    saleUnit: line.saleUnit,
    saleUnitLabel: line.saleUnitLabel,
    price: line.unitPrice,
    priceFormatted: line.unitPriceFormatted,
    photoUrl: null,
    category: null,
    nextSlotMaxQuantity: null,
    nextSlotRemainingQuantity: null,
  };
}

function orderToSyntheticSlot(order: ClientOrder): CollectionSlot {
  return {
    date: order.collectionDate,
    dateLabel: order.collectionDateLabel ?? order.collectionDate,
    distributionPointId: order.distributionPoint?.id ?? 0,
    locationLabel: order.distributionPoint?.locationLabel ?? "",
    distributionDay: "",
    distributionDayLabel: "",
    distributionStartTime: "",
    distributionEndTime: "",
    orderDeadlineAt: order.orderDeadlineAt,
    orderDeadlineLabel: "",
  };
}

function ProductRow({
  product,
  quantity,
  onChange,
  stockHint,
  readOnly = false,
  compact = false,
}: {
  product: ShopProduct;
  quantity: number;
  onChange?: (q: number) => void;
  stockHint?: string | null;
  readOnly?: boolean;
  compact?: boolean;
}) {
  return (
    <li
      className={`flex gap-3 rounded-xl border border-primary/10 bg-white ${compact ? "p-2.5" : "p-3 shadow-sm"}`}
    >
      <ProductPhoto photoUrl={product.photoUrl} alt={product.name} size={56} />
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${compact ? "text-sm" : ""}`}>{product.name}</p>
        <p className="text-sm text-primary">
          {formatMoneyLabel(product.priceFormatted)} / {product.saleUnitLabel}
        </p>
        {!readOnly && stockHint && (
          <p className="mt-1 text-xs font-medium text-amber-800">{stockHint}</p>
        )}
        {readOnly ? (
          <p className="mt-2 text-sm font-semibold text-foreground">
            Quantité : <span className="text-primary">{quantity}</span>
          </p>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange?.(quantity - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 text-lg font-bold"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              max={99}
              value={quantity}
              onChange={(e) => onChange?.(Number.parseInt(e.target.value, 10) || 0)}
              className="h-9 w-12 rounded-lg border border-primary/20 text-center text-sm"
            />
            <button
              type="button"
              onClick={() => onChange?.(quantity + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 text-lg font-bold"
            >
              +
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function groupProductsByCategory(products: ShopProduct[]): ProductCategoryGroup[] {
  const groups = new Map<string, ProductCategoryGroup>();

  for (const product of products) {
    const key = product.category ? String(product.category.id) : "none";
    const label = product.category?.name ?? "Sans catégorie";
    const existing = groups.get(key);
    if (existing) {
      existing.products.push(product);
      continue;
    }
    groups.set(key, { key, label, products: [product] });
  }

  return [...groups.values()];
}

function resolveStockHint(product: ShopProduct, isNextReservableSlot: boolean): string | null {
  if (product.nextSlotMaxQuantity === null) {
    return null;
  }

  if (isNextReservableSlot) {
    const remaining = product.nextSlotRemainingQuantity;
    if (remaining !== null && remaining > 0 && remaining < 3) {
      return formatLowStockHint(remaining, product.saleUnitLabel);
    }

    return null;
  }

  return "Disponibilité selon récolte";
}

function formatLowStockHint(remaining: number, saleUnitLabel: string): string {
  if (remaining === 1) {
    return `Dernière unité disponible (${saleUnitLabel})`;
  }

  return `Plus que ${remaining} disponibles (${saleUnitLabel})`;
}
