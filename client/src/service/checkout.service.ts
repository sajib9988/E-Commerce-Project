"use server";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

export type CreateOrderInput = {
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
  }>;
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  couponCode?: string;
  idempotencyKey: string;
};

const request = async <T>(endpoint: string, data: unknown): Promise<T | ApiError> => {
  if (!BASE_URL) {
    return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  }

  try {
    const res = await fetch(`${BASE_URL.replace(/\\/+$/, "")}/${endpoint}`, {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
      cache: "no-store",
    });

    const result = await safeJson<T | ApiError>(res);

    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        message:
          result && typeof result === "object" && "message" in result
            ? String(result.message)
            : "Request failed",
      };
    }

    return result as T;
  } catch (error) {
    console.error("Checkout request failed:", error);
    return { success: false, message: "Failed to process checkout request" };
  }
};

export const createPendingOrder = async (data: CreateOrderInput) => {
  return request("orders", data);
};

export const createCheckoutSession = async (orderId: string) => {
  return request<{ checkoutUrl?: string; orderId?: string }>(
    "payments/checkout",
    { orderId },
  );
};
