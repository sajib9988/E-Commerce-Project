"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
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
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(await getAuthHeaders()),
        ...Object.fromEntries(new Headers(options.headers).entries()),
      },
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
    console.error("Order request failed:", error);
    return { success: false, message: "Failed to process order request" };
  }
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

  if (!("success" in (result as object)) || (result as ApiError).success !== false) {
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
