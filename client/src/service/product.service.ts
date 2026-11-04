"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const ENDPOINT = "/products";

type ApiError = { success: false; message: string; statusCode?: number };
type ProductQuery = {
  page?: number; limit?: number; search?: string; collection?: string;
  categoryId?: string; sortBy?: string; sortOrder?: "asc" | "desc";
  minPrice?: number; maxPrice?: number;
};
type AdminProductQuery = {
  page?: number; limit?: number; search?: string; categoryId?: string;
  isActive?: boolean; sortBy?: string; sortOrder?: "asc" | "desc";
};

async function getAuthHeaders(isJson = true) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson<T>(response: Response): Promise<T | ApiError> {
  try {
    return (await response.json()) as T;
  } catch {
    return { success: false, message: "Invalid JSON response from server" };
  }
}

async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T | ApiError> {
  if (!BASE_URL) return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = authenticated ? await getAuthHeaders(!isFormData) : {};
    const suppliedHeaders = new Headers(options.headers);
    suppliedHeaders.forEach((value, key) => { headers[key] = value; });
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}${path}`, {
      ...options, headers, ...(options.cache || options.next ? {} : { cache: "no-store" }),
    });
    const data = await safeJson<T>(response);
    if (!response.ok) {
      const message = typeof data === "object" && data !== null && "message" in data
        ? String(data.message) : `Request failed: ${response.status}`;
      return { success: false, statusCode: response.status, message };
    }
    return data;
  } catch (error) {
    console.error("Product request failed:", error);
    return { success: false, message: "Unable to connect to the server" };
  }
}

function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}

function buildQuery(params: object) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.size ? `?${query.toString()}` : "";
}

export async function getProducts(params: ProductQuery = {}) {
  return request(`${ENDPOINT}${buildQuery(params)}`, { next: { revalidate: 60 } }, false);
}

export async function getProductById(id: string) {
  return request(`${ENDPOINT}/${encodeURIComponent(id)}`, { next: { revalidate: 60 } }, false);
}

export async function getAdminProducts(params: AdminProductQuery = {}) {
  return request(`${ENDPOINT}/admin/list${buildQuery(params)}`);
}

export async function createProduct(formData: FormData) {
  const result = await request(ENDPOINT, { method: "POST", body: formData });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function updateProduct(id: string, formData: FormData) {
  const result = await request(`${ENDPOINT}/${encodeURIComponent(id)}`, { method: "PATCH", body: formData });
  if (!isApiError(result)) {
    revalidatePath("/admin/products");
    revalidatePath(`/products/${id}`);
  }
  return result;
}

export async function deleteProduct(id: string) {
  const result = await request(`${ENDPOINT}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function getProductVariants(productId: string) {
  return request(`/products/${encodeURIComponent(productId)}/variants`, { next: { revalidate: 60 } }, false);
}

export async function createProductVariant(data: {
  productId: string; sizeId: string; sku: string; regularPrice: number;
  salePrice?: number | null; stockQuantity?: number; apliiqVariantSku?: string | null;
  colorName?: string | null; colorHex?: string | null; apliiqColorId?: string | null; isActive?: boolean;
}) {
  const result = await request("/products/variants", { method: "POST", body: JSON.stringify(data) });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function updateProductVariant(id: string, data: Record<string, unknown>) {
  const result = await request(`/products/variants/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function archiveProductVariant(id: string) {
  const result = await request(`/products/variants/${encodeURIComponent(id)}/archive`, { method: "PATCH" });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function getSizeTemplates(includeInactive = false) {
  const query = includeInactive ? "?includeInactive=true" : "";
  return request(`/size-templates${query}`, { next: { revalidate: 60 } }, false);
}

export async function createSizeTemplate(data: {
  name: string; slug: string; description?: string;
  sizes: Array<{ label: string; sortOrder?: number }>; isActive?: boolean;
}) {
  const result = await request("/size-templates", { method: "POST", body: JSON.stringify(data) });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function updateSizeTemplate(id: string, data: Record<string, unknown>) {
  const result = await request(`/size-templates/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function addTemplateSize(id: string, data: { label: string; sortOrder?: number }) {
  const result = await request(`/size-templates/${encodeURIComponent(id)}/sizes`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function archiveTemplateSize(id: string, sizeId: string) {
  const result = await request(`/size-templates/${encodeURIComponent(id)}/sizes/${encodeURIComponent(sizeId)}/archive`, {
    method: "PATCH",
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}
