
"use server";

import { cookies } from "next/headers";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

// ─── AUTH HEADERS ──────────────────────────────────

export async function getAuthHeaders(
  headers: Record<string, string> = {},
): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...headers,
    ...(accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : {}),
  };
}

// ─── SAFE FETCH ────────────────────────────────────

export async function safeFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response | null> {
  if (!BASE_URL) {
    console.error("NEXT_PUBLIC_BASE_URL is not configured");
    return null;
  }

  try {
    const isFormData =
      typeof FormData !== "undefined" &&
      options.body instanceof FormData;

    const headers = await getAuthHeaders();

    if (isFormData) {
      delete headers["Content-Type"];
    }

    return await fetch(
      `${BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
      {
        ...options,
        cache: "no-store",
        headers: {
          ...headers,
          ...(options.headers as
            | Record<string, string>
            | undefined),
        },
      },
    );
  } catch (error) {
    console.error("CMS API request failed:", error);
    return null;
  }
}

// ─── PARSE RESPONSE ────────────────────────────────

export async function parseResponse<T = unknown>(
  response: Response | null,
): Promise<T | ApiError> {
  if (!response) {
    return {
      success: false,
      message: "API server is not connected",
    };
  }

  const contentType =
    response.headers.get("content-type") ?? "";

  const data: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data
        ? String(data.message)
        : `Request failed: ${response.status}`;

    return {
      success: false,
      statusCode: response.status,
      message,
    };
  }

  return data as T;
}
