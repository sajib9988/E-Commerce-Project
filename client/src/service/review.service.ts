"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
type ApiError = { success: false; message: string; statusCode?: number };
type ReviewInput = { rating: number; title?: string; body: string };

async function getAuthHeaders() {
  const store = await cookies();
  const token = store.get("accessToken")?.value;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function safeJson<T>(response: Response): Promise<T | ApiError> {
  try { return (await response.json()) as T; }
  catch { return { success: false, message: "Invalid JSON response from server" }; }
}
function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T | ApiError> {
  if (!BASE_URL) return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}${path}`, {
      ...options, headers: authenticated ? await getAuthHeaders() : {},
      ...(options.cache || options.next ? {} : { cache: "no-store" }),
    });
    const data = await safeJson<T>(response);
    if (!response.ok) {
      const message = typeof data === "object" && data !== null && "message" in data
        ? String(data.message) : `Request failed: ${response.status}`;
      return { success: false, statusCode: response.status, message };
    }
    return data;
  } catch (error) {
    console.error("Review request failed:", error);
    return { success: false, message: "Unable to connect to the server" };
  }
}
function isError(value: unknown): value is ApiError { return isApiError(value); }

export type MyReview = {
  id: string; productId: string; rating: number; title: string | null; body: string;
  status: "PENDING" | "APPROVED" | "REJECTED"; moderationNote: string | null;
  createdAt: string; updatedAt: string; product: { name: string };
};

export async function getMyReviews() {
  return request<MyReview[]>("/reviews/me");
}

export async function getProductReviews(productId: string, page = 1, limit = 20) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request(`/products/${encodeURIComponent(productId)}/reviews?${query}`, { next: { revalidate: 60 } }, false);
}
export async function createProductReview(productId: string, data: ReviewInput) {
  const result = await request(`/products/${encodeURIComponent(productId)}/reviews`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isError(result)) revalidatePath(`/products/${productId}`);
  return result;
}
export async function updateMyReview(id: string, data: ReviewInput) {
  const result = await request(`/reviews/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isError(result)) revalidatePath("/account/reviews");
  return result;
}
export async function deleteMyReview(id: string) {
  const result = await request(`/reviews/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isError(result)) revalidatePath("/account/reviews");
  return result;
}
export async function getAdminReviews(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const query = status ? `?status=${status}` : "";
  return request(`/admin/reviews${query}`);
}
export async function moderateReview(id: string, data: { status: "APPROVED" | "REJECTED"; note?: string }) {
  const result = await request(`/admin/reviews/${encodeURIComponent(id)}/moderate`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isError(result)) revalidatePath("/admin/reviews");
  return result;
}
