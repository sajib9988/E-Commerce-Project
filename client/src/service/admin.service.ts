"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = { success: false; message: string; statusCode?: number };
type UserInput = { name: string; email: string; password: string; role?: "USER" | "ADMIN" | "SUPER_ADMIN" };



function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { context: "admin request" });
}
function buildQuery(params: { search?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}


/** Customer-only endpoints; unlike user/role administration these are available to ADMIN and SUPER_ADMIN. */
export async function getAdminCustomers(params: { search?: string; page?: number; limit?: number } = {}) {
  return request(`/admin/customers${buildQuery(params)}`);
}
export async function getAdminCustomerById(id: string) {
  return request(`/admin/customers/${encodeURIComponent(id)}`);
}

// User administration endpoints are SUPER_ADMIN-only in the NestJS backend.
export async function getAdminUsers(params: { search?: string; page?: number; limit?: number } = {}) {
  return request(`/users${buildQuery(params)}`);
}
export async function getAdminUserById(id: string) {
  return request(`/users/${encodeURIComponent(id)}`);
}
export async function createAdminUser(data: UserInput) {
  const result = await request("/users", { method: "POST", body: JSON.stringify(data) });
  if (!isApiError(result)) revalidatePath("/admin/users");
  return result;
}
export async function updateAdminUser(id: string, data: Partial<UserInput>) {
  const result = await request(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/users");
  return result;
}
export async function updateAdminUserRole(id: string, role: "USER" | "ADMIN" | "SUPER_ADMIN") {
  const result = await request(`/users/${encodeURIComponent(id)}/role`, {
    method: "PATCH", body: JSON.stringify({ role }),
  });
  if (!isApiError(result)) revalidatePath("/admin/users");
  return result;
}
export async function deleteAdminUser(id: string) {
  const result = await request(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isApiError(result)) revalidatePath("/admin/users");
  return result;
}

// Category endpoints are admin-managed and are grouped here to avoid another tiny service.
export async function getCategories() {
  return request("/categories");
}
export async function createCategory(data: Record<string, unknown>) {
  const result = await request("/categories", { method: "POST", body: JSON.stringify(data) });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}
export async function updateCategory(id: string, data: Record<string, unknown>) {
  const result = await request(`/categories/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}
export async function deleteCategory(id: string) {
  const result = await request(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}
export async function createSubcategory(categoryId: string, data: { name: string; slug?: string }) {
  const result = await request(`/categories/${encodeURIComponent(categoryId)}/subcategories`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}
export async function updateSubcategory(id: string, data: Record<string, unknown>) {
  const result = await request(`/categories/subcategories/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}
export async function deleteSubcategory(id: string) {
  const result = await request(`/categories/subcategories/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

// Apliiq artwork and design management endpoints.
export async function createApliiqArtwork(productId: string, formData: FormData) {
  if (!BASE_URL) return { success: false as const, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const store = await cookies();
    const token = store.get("accessToken")?.value;
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}/admin/apliiq/products/${encodeURIComponent(productId)}/artworks`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
      cache: "no-store",
    });
    const result = await safeJson(response);
    if (response.ok) revalidatePath("/admin/products");
    return result;
  } catch (error) {
    console.error("Apliiq artwork request failed:", error);
    return { success: false as const, message: "Unable to connect to the server" };
  }
}
export async function createApliiqDesign(productId: string, data: Record<string, unknown>) {
  const result = await request(`/admin/apliiq/products/${encodeURIComponent(productId)}/designs`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function registerProductImageAsApliiqArtwork(productId: string, name?: string, style = "OTHER") {
  const result = await request(`/admin/apliiq/products/${encodeURIComponent(productId)}/artworks/use-product-image`, {
    method: "POST", body: JSON.stringify({ name, style }),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}

export async function addApliiqArtworkPlacement(
  artworkId: string,
  data: {
    locationId: string; service: string; printColors?: string; boxId?: number;
    note?: string; widthInches?: number; heightInches?: number;
  },
) {
  const result = await request(`/admin/apliiq/artworks/${encodeURIComponent(artworkId)}/placements`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/products");
  return result;
}


// Apliiq cancellation is a provider workflow, separate from customer refunds.
export async function reconcileApliiqOrder(orderId: string) {
  const result = await request(`/admin/apliiq/orders/${encodeURIComponent(orderId)}/reconcile`, { method: "POST" });
  if (!isApiError(result)) {
    revalidatePath("/admin/apliiq");
    revalidatePath("/admin/orders");
  }
  return result;
}

export async function requestApliiqCancellation(orderId: string) {
  const result = await request(`/admin/apliiq/orders/${encodeURIComponent(orderId)}/cancel-request`, { method: "POST" });
  if (!isApiError(result)) {
    revalidatePath("/admin/apliiq");
    revalidatePath("/admin/orders");
  }
  return result;
}
