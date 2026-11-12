"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";


const ORDER_ENDPOINT = "/orders";

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

type OrderQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false
  );
};

const buildQuery = (params: OrderQuery = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  return query.toString() ? `?${query.toString()}` : "";
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | ApiError> => {
  return apiRequest<T>(endpoint, options, { context: "undefined request" });
};

export const getMyOrders = async (params: Omit<OrderQuery, "status"> = {}) => {
  return request(`${ORDER_ENDPOINT}/me${buildQuery(params)}`);
};

export const getMyOrderById = async (id: string) => {
  return request(`${ORDER_ENDPOINT}/${encodeURIComponent(id)}`);
};

export const cancelMyOrder = async (id: string) => {
  const result = await request(
    `${ORDER_ENDPOINT}/${encodeURIComponent(id)}/cancel`,
    { method: "POST" },
  );

  if (!isApiError(result)) {
    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);
  }

  return result;
};

export const getAdminOrders = async (params: OrderQuery = {}) => {
  return request(`/admin/orders${buildQuery(params)}`);
};

export const getAdminOrderById = async (id: string) => {
  return request(`/admin/orders/${encodeURIComponent(id)}`);
};

export const updateOrderStatus = async (id: string, status: string) => {
  const result = await request(
    `/admin/orders/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  if (!("success" in (result as object)) || (result as ApiError).success !== false) {
    revalidatePath("/admin/orders");
  }

  return result;
};

export const retryApliiqFulfillment = async (orderId: string) => {
  const result = await request(
    `/admin/apliiq/orders/${encodeURIComponent(orderId)}/retry`,
    { method: "POST" },
  );
  if (!isApiError(result)) revalidatePath("/admin/orders");
  return result;
};
