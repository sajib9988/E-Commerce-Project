import "server-only";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

export type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

type ApiRequestConfig = {
  authenticated?: boolean;
  context?: string;
  fallbackMessage?: string;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

/**
 * Shared server-side API transport.
 * Service modules keep endpoint-specific functions and response types;
 * this helper owns auth headers, JSON parsing, status handling and network errors.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  config: ApiRequestConfig = {},
): Promise<T | ApiError> {
  if (!BASE_URL) {
    return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  }

  try {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = new Headers(
      config.authenticated === false ? {} : await getAuthHeaders(!isFormData),
    );
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    const response = await fetch(
      `${BASE_URL.replace(/\\/+$/, "")}/${path.replace(/^\\/+/, "")}`,
      {
        ...options,
        headers,
        ...(options.cache || options.next ? {} : { cache: "no-store" }),
      },
    );

    const data = await safeJson<T | ApiError>(response);
    if (!response.ok) {
      const rawMessage =
        data && typeof data === "object" && "message" in data
          ? data.message
          : undefined;
      const message = Array.isArray(rawMessage)
        ? rawMessage.map(String).join(", ")
        : typeof rawMessage === "string"
          ? rawMessage
          : `Request failed: ${response.status}`;

      return { success: false, statusCode: response.status, message };
    }

    return data as T;
  } catch (error) {
    console.error(config.context ?? "API request failed:", error);
    return {
      success: false,
      message: config.fallbackMessage ?? "Unable to connect to the server",
    };
  }
}
