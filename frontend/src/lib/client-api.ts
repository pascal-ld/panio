import { apiFetch } from "@/lib/api";

export type ProducerSummary = {
  id: number;
  fullName: string | null;
  slug: string;
  shopUrl: string;
  producerOrganic?: boolean;
};

export type ShopProduct = {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  saleUnit: string;
  saleUnitLabel: string;
  price: string;
  priceFormatted: string;
  photoUrl: string | null;
  category: { id: number; name: string } | null;
  nextSlotMaxQuantity: number | null;
  nextSlotRemainingQuantity: number | null;
};

export type CollectionSlot = {
  date: string;
  dateLabel: string;
  distributionPointId: number;
  locationLabel: string;
  distributionDay: string;
  distributionDayLabel: string;
  distributionStartTime: string;
  distributionEndTime: string;
  orderDeadlineAt: string;
  orderDeadlineLabel: string;
};

export type ShopData = {
  producer: {
    id: number;
    fullName: string | null;
    slug: string;
    advanceBookingDays: number;
    producerPhotoPath: string | null;
    producerOrganic: boolean;
    producerDescription: string | null;
  };
  products: ShopProduct[];
  collectionSlots: CollectionSlot[];
  nextReservableDate: string | null;
  myOrders: ClientOrder[];
};

export function fetchProducers(): Promise<ProducerSummary[]> {
  return apiFetch<ProducerSummary[]>("/api/client/producers");
}

export type ClientProfile = {
  fullName: string | null;
  email: string;
  phone: string | null;
};

export function fetchClientProfile(): Promise<ClientProfile> {
  return apiFetch<ClientProfile>("/api/client/profile");
}

export function updateClientProfile(payload: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<ClientProfile> {
  return apiFetch<ClientProfile>("/api/client/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function fetchClientPreferences(): Promise<{ favoriteProducers: ProducerSummary[] }> {
  return apiFetch("/api/client/preferences");
}

export function addFavoriteProducer(slug: string): Promise<{ favoriteProducers: ProducerSummary[] }> {
  return apiFetch("/api/client/favorite-producer", {
    method: "PUT",
    body: JSON.stringify({ slug }),
  });
}

export function removeFavoriteProducer(slug: string): Promise<{ favoriteProducers: ProducerSummary[] }> {
  return apiFetch("/api/client/favorite-producer", {
    method: "DELETE",
    body: JSON.stringify({ slug }),
  });
}

export function fetchShop(slug: string): Promise<ShopData> {
  return apiFetch<ShopData>(`/api/client/shop/${slug}`);
}

export type OrderLine = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  unitPriceFormatted: string;
  lineTotalFormatted: string;
  saleUnit: string;
  saleUnitLabel: string;
  photoUrl?: string | null;
};

export type ClientOrder = {
  id: number;
  status: string;
  statusLabel: string;
  collectionDate: string;
  collectionDateLabel?: string | null;
  orderDeadlineAt: string;
  canEdit: boolean;
  canCancel: boolean;
  distributionPoint: { id: number; locationLabel: string } | null;
  producer: { id: number; fullName: string | null; slug: string } | null;
  producerComment?: string | null;
  lines: OrderLine[];
  totalFormatted: string;
  updatedAt: string;
};

export function fetchActiveOrder(
  producerSlug: string,
  collectionDate: string,
  distributionPointId: number,
): Promise<{ order: ClientOrder | null }> {
  const params = new URLSearchParams({
    producerSlug,
    collectionDate,
    distributionPointId: String(distributionPointId),
  });
  return apiFetch(`/api/client/orders/active?${params}`);
}

export function saveOrder(payload: {
  producerSlug: string;
  collectionDate: string;
  distributionPointId: number;
  lines: { productId: number; quantity: number }[];
  reserve?: boolean;
}): Promise<ClientOrder> {
  return apiFetch<ClientOrder>("/api/client/orders", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function reserveOrder(orderId: number): Promise<ClientOrder> {
  return apiFetch<ClientOrder>(`/api/client/orders/${orderId}/reserve`, { method: "POST" });
}

export function cancelOrder(orderId: number): Promise<ClientOrder> {
  return apiFetch<ClientOrder>(`/api/client/orders/${orderId}/cancel`, { method: "POST" });
}

export function fetchClientOrders(
  scope: "all" | "active" | "history" = "all",
  producerSlug?: string,
): Promise<ClientOrder[]> {
  const params = new URLSearchParams({ scope });
  if (producerSlug) params.set("producerSlug", producerSlug);
  return apiFetch<ClientOrder[]>(`/api/client/orders?${params}`);
}

export function orderSlotKey(order: ClientOrder): string {
  const pointId = order.distributionPoint?.id;
  if (!pointId) return order.collectionDate;
  return `${order.collectionDate}-${pointId}`;
}
