"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
type ApiError = { success: false; message: string; statusCode?: number };
type OrderQuery = { page?: number; limit?: number; status?: string };

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
  return typeof value === "object" && value !== null && "statusCode" in value;
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T | ApiError> {
  if (!BASE_URL) return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}${path}`, {
      ...options, headers: await getAuthHeaders(), cache: "no-store",
    });
    const data = await safeJson<T>(response);
    if (!response.ok) {
      const message = typeof data === "object" && data !== null && "message" in data
        ? String(data.message) : `Request failed: ${response.status}`;
      return { success: false, statusCode: response.status, message };
    }
    return data;
  } catch (error) {
    console.error("Order request failed:", error);
    return { success: false, message: "Unable to connect to the server" };
  }
}
function buildQuery(params: OrderQuery) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.size ? `?${query.toString()}` : "";
}

export async function getMyOrders(params: Omit<OrderQuery, "status"> = {}) {
  return request(`/orders/me${buildQuery(params)}`);
}
export async function getMyOrderById(id: string) {
  return request(`/orders/${encodeURIComponent(id)}`);
}
export async function cancelMyOrder(id: string) {
  const result = await request(`/orders/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  if (!isApiError(result)) {
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
  }
  return result;
}
export async function getAdminOrders(params: OrderQuery = {}) {
  return request(`/admin/orders${buildQuery(params)}`);
}
export async function getAdminOrderById(id: string) {
  return request(`/admin/orders/${encodeURIComponent(id)}`);
}
export async function updateOrderStatus(id: string, status: string) {
  const result = await request(`/admin/orders/${encodeURIComponent(id)}/status`, {
    method: "PATCH", body: JSON.stringify({ status }),
  });
  if (!isApiError(result)) revalidatePath("/admin/orders");
  return result;
}
