import { apiFetch } from "@/lib/api";

export type ProducteurOrderLine = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  unitPriceFormatted: string;
  lineTotalFormatted: string;
  saleUnit: string;
  saleUnitLabel: string;
};

export type ProducteurOrder = {
  id: number;
  status: string;
  statusLabel: string;
  collectionDate: string;
  canEdit: boolean;
  canCancel: boolean;
  distributionPoint: { id: number; locationLabel: string } | null;
  client: { id: number; fullName: string | null; email: string; phone: string | null };
  producerComment?: string | null;
  lines: ProducteurOrderLine[];
  totalFormatted: string;
  updatedAt: string;
};

export type AssistedClient = {
  id: number;
  fullName: string | null;
  email: string;
  phone: string | null;
};

export type AssistedProduct = {
  id: number;
  name: string;
  saleUnitLabel: string | null;
  priceFormatted: string;
  photoUrl: string | null;
  nextSlotMaxQuantity: number | null;
  nextSlotRemainingQuantity: number | null;
  isSoldOut: boolean;
};

export type AssistedContext = {
  distributionPoints: { id: number; locationLabel: string }[];
  products: AssistedProduct[];
  isNextReservableDate: boolean;
};

export type HarvestItem = {
  productId: number;
  productName: string;
  saleUnit: string;
  saleUnitLabel: string;
  totalQuantity: number;
};

export function fetchOrderDates(): Promise<string[]> {
  return apiFetch<string[]>("/api/producteur/orders/dates");
}

export function fetchOrdersForDate(date: string, status?: string): Promise<ProducteurOrder[]> {
  const params = new URLSearchParams({ date });
  if (status) params.set("status", status);
  return apiFetch<ProducteurOrder[]>(`/api/producteur/orders?${params}`);
}

export type HarvestSummary = {
  date: string;
  pending: HarvestItem[];
  harvested: HarvestItem[];
};

export function fetchHarvest(date: string): Promise<HarvestSummary> {
  return apiFetch(`/api/producteur/orders/harvest?date=${date}`);
}

export function updateOrderStatus(
  orderId: number,
  status: "prepared" | "retrieved" | "absent",
  producerComment?: string,
): Promise<ProducteurOrder> {
  return apiFetch<ProducteurOrder>(`/api/producteur/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, producerComment }),
  });
}

export function sendProducerBroadcast(date: string, message: string): Promise<{ sentCount: number }> {
  return apiFetch<{ sentCount: number }>("/api/producteur/orders/broadcast", {
    method: "POST",
    body: JSON.stringify({ date, message }),
  });
}

export function fetchAssistedClients(query = ""): Promise<AssistedClient[]> {
  const params = new URLSearchParams();
  if (query.trim() !== "") {
    params.set("q", query.trim());
  }
  return apiFetch<AssistedClient[]>(`/api/producteur/orders/clients${params.size ? `?${params}` : ""}`);
}

export function fetchAssistedContext(date: string): Promise<AssistedContext> {
  const params = new URLSearchParams({ date });
  return apiFetch<AssistedContext>(`/api/producteur/orders/assist-context?${params}`);
}

export function createAssistedOrder(payload: {
  clientId?: number;
  client?: { fullName: string; email: string; phone: string };
  distributionPointId: number;
  collectionDate: string;
  lines: { productId: number; quantity: number }[];
}): Promise<ProducteurOrder> {
  return apiFetch<ProducteurOrder>("/api/producteur/orders/assisted", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
