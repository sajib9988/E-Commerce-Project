"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
type ApiError = { success: false; message: string; statusCode?: number };
type CouponInput = {
  code: string; type: "PERCENT" | "FIXED" | "FREE_SHIPPING"; value: number;
  minOrderAmount?: number; maxDiscountAmount?: number; startsAt?: string;
  expiresAt?: string; isActive?: boolean; usageLimit?: number; perUserLimit?: number; userId?: string;
};

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
    console.error("Coupon request failed:", error);
    return { success: false, message: "Unable to connect to the server" };
  }
}

export type AvailableCoupon = {
  id: string; code: string; type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: string; minOrderAmount: string | null; maxDiscountAmount: string | null;
  startsAt: string | null; expiresAt: string | null;
};

export async function getAvailableCoupons() {
  return request<AvailableCoupon[]>("/coupons/available");
}

export async function validateCoupon(data: {
  code: string; items: Array<{ productId: string; quantity: number }>;
}) {
  return request("/coupons/validate", { method: "POST", body: JSON.stringify(data) });
}
export type AdminCoupon = AvailableCoupon & {
  isActive: boolean; usageLimit: number | null; usageCount: number; perUserLimit: number;
  userId: string | null; createdAt: string; updatedAt: string;
};

export async function getCoupons() {
  return request<AdminCoupon[]>("/coupons");
}
export async function getCouponById(id: string) {
  return request(`/coupons/${encodeURIComponent(id)}`);
}
export async function createCoupon(data: CouponInput) {
  const result = await request("/coupons", { method: "POST", body: JSON.stringify(data) });
  if (!isApiError(result)) revalidatePath("/admin/coupons");
  return result;
}
export async function updateCoupon(id: string, data: Partial<CouponInput>) {
  const result = await request(`/coupons/${encodeURIComponent(id)}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/coupons");
  return result;
}
export async function disableCoupon(id: string) {
  const result = await request(`/coupons/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!isApiError(result)) revalidatePath("/admin/coupons");
  return result;
}
