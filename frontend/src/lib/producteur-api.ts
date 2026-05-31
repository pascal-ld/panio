import { apiFetch } from "@/lib/api";

export type Category = {
  id: number;
  name: string;
  slug: string;
  productCount?: number;
};

export type SaleUnitOption = {
  value: string;
  label: string;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  saleUnit: string;
  saleUnitLabel: string;
  price: string;
  priceFormatted?: string;
  photoUrl: string | null;
  category: { id: number; name: string } | null;
  isAvailable: boolean;
  nextSlotMaxQuantity: number | null;
  createdAt: string;
};

export type ProductPayload = {
  name: string;
  categoryId?: number | null;
  unit: string;
  saleUnit: string;
  price: string;
  description?: string;
  nextSlotMaxQuantity?: number | null;
  photo?: File | null;
};

export type CreateProductPayload = ProductPayload;

export function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>("/api/producteur/categories");
}

export function createCategory(name: string): Promise<Category> {
  return apiFetch<Category>("/api/producteur/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateCategory(categoryId: number, name: string): Promise<Category> {
  return apiFetch<Category>(`/api/producteur/categories/${categoryId}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function deleteCategory(categoryId: number): Promise<void> {
  return apiFetch<void>(`/api/producteur/categories/${categoryId}`, {
    method: "DELETE",
  });
}

export function fetchSaleUnits(): Promise<SaleUnitOption[]> {
  return apiFetch<SaleUnitOption[]>("/api/producteur/products/sale-units");
}

export function fetchProducts(): Promise<Product[]> {
  return apiFetch<Product[]>("/api/producteur/products");
}

export function fetchProduct(productId: number): Promise<Product> {
  return apiFetch<Product>(`/api/producteur/products/${productId}`);
}

export function updateProductAvailability(
  productId: number,
  isAvailable: boolean,
): Promise<Product> {
  return apiFetch<Product>(`/api/producteur/products/${productId}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ isAvailable }),
  });
}

function buildProductFormData(payload: ProductPayload): FormData {
  const formData = new FormData();
  formData.append("name", payload.name);
  if (payload.categoryId != null && payload.categoryId > 0) {
    formData.append("categoryId", String(payload.categoryId));
  }
  formData.append("unit", payload.unit);
  formData.append("saleUnit", payload.saleUnit);
  formData.append("price", payload.price);
  if (payload.description) {
    formData.append("description", payload.description);
  }
  if (payload.nextSlotMaxQuantity != null && payload.nextSlotMaxQuantity > 0) {
    formData.append("nextSlotMaxQuantity", String(payload.nextSlotMaxQuantity));
  }
  if (payload.photo && payload.photo.size > 0) {
    formData.append("photo", payload.photo, payload.photo.name);
  }
  return formData;
}

export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  return apiFetch<Product>("/api/producteur/products", {
    method: "POST",
    body: buildProductFormData(payload),
  });
}

export async function updateProduct(
  productId: number,
  payload: ProductPayload,
): Promise<Product> {
  return apiFetch<Product>(`/api/producteur/products/${productId}`, {
    method: "POST",
    body: buildProductFormData(payload),
  });
}

export function getPhotoUrl(path: string | null): string | null {
  if (!path) {
    return null;
  }
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
