"use server";

import { apiRequest } from "@/lib/api/server-request";


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
  return apiRequest<T>(endpoint, { method: "POST", body: JSON.stringify(data) }, { context: "Checkout request" });
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
