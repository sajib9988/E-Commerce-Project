"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

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

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false
  );
}

function getErrorMessage(data: unknown, status: number) {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data
  ) {
    const message = data.message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }

  return `Request failed: ${status}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
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
        ...options,
        headers: {
          ...(await getAuthHeaders()),
          ...Object.fromEntries(new Headers(options.headers).entries()),
        },
        cache: "no-store",
      },
    );

    const data = await safeJson<T | ApiError>(response);

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message: getErrorMessage(data, response.status),
      };
    }

    // Some successful mutation endpoints may respond with HTTP 204.
    return data as T;
  } catch (error) {
    console.error("Order request failed:", error);
    return {
      success: false,
      message: "Unable to connect to the server",
    };
  }
}

function buildQuery(params: OrderQuery) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function getMyOrders(
  params: Omit<OrderQuery, "status"> = {},
) {
  return request(`/orders/me${buildQuery(params)}`);
}

export async function getMyOrderById(id: string) {
  return request(`/orders/${encodeURIComponent(id)}`);
}

export async function cancelMyOrder(id: string) {
  const result = await request(
    `/orders/${encodeURIComponent(id)}/cancel`,
    { method: "POST" },
  );

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
  const result = await request(
    `/admin/orders/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

  if (!isApiError(result)) {
    revalidatePath("/admin/orders");
  }

  return result;
}
