"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";

const ENDPOINT = "/collections";

type ApiError = { success: false; message: string; statusCode?: number };
type CollectionQuery = {
  featured?: boolean; page?: number; limit?: number; search?: string;
  sortBy?: string; sortOrder?: "asc" | "desc";
};





async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { authenticated, context: "undefined request" });
}

function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}

function buildQuery(params: object) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function getCollections(params: CollectionQuery = {}) {
  return request(`${ENDPOINT}${buildQuery(params)}`, { next: { revalidate: 60 } }, false);
}

export async function getCollectionBySlug(slug: string) {
  return request(`${ENDPOINT}/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } }, false);
}

export async function getAdminCollections(params: Omit<CollectionQuery, "featured"> & {
  isActive?: boolean; isFeatured?: boolean;
} = {}) {
  return request(`${ENDPOINT}/admin/list${buildQuery(params)}`);
}

export async function createCollection(data: {
  name: string; slug: string; description?: string; bannerImage?: string;
  thumbnail?: string; isActive?: boolean; isFeatured?: boolean; sortOrder?: number;
}) {
  const result = await request(ENDPOINT, { method: "POST", body: JSON.stringify(data) });
  if (!isApiError(result)) {
    revalidatePath("/admin/collections");
    revalidatePath("/collections");
  }
  return result;
}

export async function updateCollection(id: string, data: Record<string, unknown>) {
  const result = await request(`${ENDPOINT}/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) {
    revalidatePath("/admin/collections");
    revalidatePath("/collections");
  }
  return result;
}

export async function archiveCollection(id: string) {
  const result = await request(`${ENDPOINT}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isApiError(result)) revalidatePath("/admin/collections");
  return result;
}
