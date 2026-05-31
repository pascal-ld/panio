import { apiFetch } from "@/lib/api";

export type AdminProducer = {
  id: number;
  fullName: string | null;
  email: string;
  slug: string | null;
  enabled: boolean;
  isEmailVerified: boolean;
  pendingPasswordSetup?: boolean;
};

export type AdminUser = {
  id: number;
  fullName: string | null;
  email: string;
  phone: string | null;
  role: string;
  roleLabel: string;
  enabled: boolean;
  isEmailVerified: boolean;
  pendingPasswordSetup?: boolean;
  slug: string | null;
};

export type AdminUserRole = "ROLE_CLIENT" | "ROLE_PRODUCTEUR" | "ROLE_SUPER_ADMIN";

export async function fetchAdminProducers(query = ""): Promise<AdminProducer[]> {
  const params = query.trim() !== "" ? `?q=${encodeURIComponent(query.trim())}` : "";
  return apiFetch<AdminProducer[]>(`/api/admin/producers${params}`);
}

export async function createAdminProducer(payload: {
  fullName: string;
  email: string;
  enabled?: boolean;
}): Promise<AdminProducer & { message?: string }> {
  return apiFetch<AdminProducer & { message?: string }>("/api/admin/producers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminProducer(
  id: number,
  payload: {
    fullName?: string;
    email?: string;
    password?: string;
    enabled?: boolean;
  },
): Promise<AdminProducer> {
  return apiFetch<AdminProducer>(`/api/admin/producers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminUsers(query = "", role = ""): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (query.trim() !== "") params.set("q", query.trim());
  if (role.trim() !== "") params.set("role", role.trim());
  const suffix = params.toString() !== "" ? `?${params.toString()}` : "";
  return apiFetch<AdminUser[]>(`/api/admin/users${suffix}`);
}

export async function createAdminUser(payload: {
  fullName?: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  enabled?: boolean;
}): Promise<AdminUser & { message?: string }> {
  return apiFetch<AdminUser & { message?: string }>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminUser(
  id: number,
  payload: {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: AdminUserRole;
    enabled?: boolean;
  },
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminUser(id: number): Promise<void> {
  await apiFetch<void>(`/api/admin/users/${id}`, { method: "DELETE" });
}

export type AdminOrderLine = {
  productId: number | null;
  productName: string;
  quantity: number;
  saleUnitLabel: string | null;
};

export type AdminOrder = {
  id: number;
  status: string;
  statusLabel: string;
  collectionDate: string | null;
  collectionDateLabel: string | null;
  distributionPoint: { id: number; locationLabel: string } | null;
  producer: { id: number; fullName: string | null; slug: string | null } | null;
  lines: AdminOrderLine[];
  totalFormatted: string;
  updatedAt: string | null;
};

export type AdminClientOrders = {
  client: {
    id: number;
    fullName: string | null;
    email: string;
    phone: string | null;
  };
  orders: AdminOrder[];
};

export type AdminOrderStatus =
  | "draft"
  | "reserved"
  | "prepared"
  | "retrieved"
  | "cancelled"
  | "absent";

export async function fetchAdminClientOrders(clientId: number): Promise<AdminClientOrders> {
  return apiFetch<AdminClientOrders>(`/api/admin/clients/${clientId}/orders`);
}

export async function updateAdminOrderStatus(
  orderId: number,
  status: AdminOrderStatus,
): Promise<AdminOrder> {
  return apiFetch<AdminOrder>(`/api/admin/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
