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

async function request<T>(
  path: string,
  data: unknown,
): Promise<T | ApiError> {
  if (!BASE_URL) {
    return {
      success: false,
      message: "NEXT_PUBLIC_BASE_URL is not configured",
    };
  }

  try {
    const response = await fetch(
      `${BASE_URL.replace(/\/+$/, "")}${path}`,
      {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(data),
        cache: "no-store",
      },
    );

    const result = await safeJson<T | ApiError>(response);

    if (!response.ok) {
      const message =
        typeof result === "object" && result !== null && "message" in result
          ? Array.isArray(result.message)
            ? result.message.join(", ")
            : String(result.message)
          : `Request failed: ${response.status}`;

      return {
        success: false,
        statusCode: response.status,
        message,
      };
    }

    if (result === null) {
      return {
        success: false,
        message: "The server returned an empty response",
      };
    }

    return result as T;
  } catch (error) {
    console.error("Checkout request failed:", error);
    return {
      success: false,
      message: "Unable to connect to the server",
    };
  }
}

export async function createPendingOrder(data: CreateOrderInput) {
  return request<unknown>("/orders", data);
}

export async function createCheckoutSession(orderId: string) {
  return request<{ checkoutUrl?: string; orderId?: string }>(
    "/payments/checkout",
    { orderId },
  );
}
