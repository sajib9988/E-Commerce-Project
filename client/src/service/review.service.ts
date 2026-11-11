"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";

type ApiError = { success: false; message: string; statusCode?: number };
type ReviewInput = { rating: number; title?: string; body: string };



function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { authenticated, context: "review request" });
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
export type AdminReview = {
  id: string; rating: number; title: string | null; body: string; status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string; product: { id: string; name: string };
  user: { id: string; name: string | null; email: string };
  order: { id: string; orderNumber: string; paymentStatus: string };
};

export async function getAdminReviews(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const query = status ? `?status=${status}` : "";
  return request<AdminReview[]>(`/admin/reviews${query}`);
}
export async function moderateReview(id: string, data: { status: "APPROVED" | "REJECTED"; note?: string }) {
  const result = await request(`/admin/reviews/${encodeURIComponent(id)}/moderate`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isError(result)) revalidatePath("/admin/reviews");
  return result;
}
