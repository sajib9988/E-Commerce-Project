"use server";

import { apiRequest } from "@/lib/api/server-request";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

type ApiError = { success: false; message: string; statusCode?: number };

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
async function request<T>(path: string, options: RequestInit = {}): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { context: "refund request" });
}
export async function createRefundRequest(orderId: string, data: { reason: string; customerNote: string }) {
  const result = await request(`/orders/${encodeURIComponent(orderId)}/refund-requests`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/account/refunds");
  return result;
}
export async function getMyRefundRequests() {
  return request("/refund-requests/me");
}
export async function getMyRefundRequestById(id: string) {
  return request(`/refund-requests/${encodeURIComponent(id)}`);
}
export async function getAdminRefundRequests(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request(`/admin/refund-requests${query}`);
}
export async function approveRefundRequest(id: string, adminNote?: string) {
  const result = await request(`/admin/refund-requests/${encodeURIComponent(id)}/approve`, {
    method: "PATCH", body: JSON.stringify({ adminNote }),
  });
  if (!isApiError(result)) revalidatePath("/admin/refunds");
  return result;
}
export async function rejectRefundRequest(id: string, adminNote?: string) {
  const result = await request(`/admin/refund-requests/${encodeURIComponent(id)}/reject`, {
    method: "PATCH", body: JSON.stringify({ adminNote }),
  });
  if (!isApiError(result)) revalidatePath("/admin/refunds");
  return result;
}
