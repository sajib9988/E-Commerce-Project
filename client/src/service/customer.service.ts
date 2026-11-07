"use server";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

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

// The current API exposes the signed-in user's profile through /auth/me.
// Profile editing and saved-address endpoints are not present in the backend yet.
export async function getMyCustomerProfile() {
  if (!BASE_URL) {
    return {
      success: false as const,
      message: "NEXT_PUBLIC_BASE_URL is not configured",
    };
  }

  try {
    const response = await fetch(
      `${BASE_URL.replace(/\/+$/, "")}/auth/me`,
      {
        headers: {
          Accept: "application/json",
          ...(await getAuthHeaders(false)),
        },
        cache: "no-store",
      },
    );

    const data = await safeJson<unknown>(response);

    if (!response.ok) {
      return {
        success: false as const,
        statusCode: response.status,
        message: getErrorMessage(data, response.status),
      };
    }

    if (data === null) {
      return {
        success: false as const,
        message: "The server returned an empty response",
      };
    }

    return data;
  } catch (error) {
    console.error("Customer profile request failed:", error);
    return {
      success: false as const,
      message: "Unable to connect to the server",
    };
  }
}
