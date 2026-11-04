"use server";

import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = { success: false; message: string; statusCode?: number };

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson<T>(response: Response): Promise<T | ApiError> {
  try { return (await response.json()) as T; }
  catch { return { success: false, message: "Invalid JSON response from server" }; }
}

async function request<T>(path: string, data: unknown): Promise<T | ApiError> {
  if (!BASE_URL) return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}${path}`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
      cache: "no-store",
    });
    const result = await safeJson<T>(response);
    if (!response.ok) {
      const message = typeof result === "object" && result !== null && "message" in result
        ? String(result.message) : `Request failed: ${response.status}`;
      return { success: false, statusCode: response.status, message };
    }
    return result;
  } catch (error) {
    console.error("Checkout request failed:", error);
    return { success: false, message: "Unable to connect to the server" };
  }
}

export type CreateOrderInput = {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  couponCode?: string;
  idempotencyKey: string;
};

export async function createPendingOrder(data: CreateOrderInput) {
  return request("/orders", data);
}

export async function createCheckoutSession(orderId: string) {
  return request<{ checkoutUrl?: string; orderId?: string }>("/payments/checkout", { orderId });
}
