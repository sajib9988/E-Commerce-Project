"use server";

import { cookies } from "next/headers";
import type { MediaAsset } from "@/type/cms";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const MEDIA_ENDPOINT = "/cms/media";

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

async function getAuthHeaders(isJson = true): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
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
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;
    const authHeaders = await getAuthHeaders(!isFormData);
    const suppliedHeaders = new Headers(options.headers);

    suppliedHeaders.forEach((value, key) => {
      authHeaders[key] = value;
    });

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: authHeaders,
      cache: "no-store",
    });

    const data = await safeJson(response);

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        message: Array.isArray(data?.message)
          ? data.message.join(", ")
          : (data?.message ?? `Request failed: ${response.status}`),
      };
    }

    return data as T;
  } catch (error) {
    console.error("Media request failed:", error);
    return {
      success: false,
      message: "Unable to connect to the server",
    };
  }
}

export async function getAllMedia() {
  return request<MediaAsset[]>(MEDIA_ENDPOINT);
}

export async function getMediaById(id: string) {
  return request<MediaAsset>(
    `${MEDIA_ENDPOINT}/${encodeURIComponent(id)}`,
  );
}

// FormData requires the browser/runtime to set multipart Content-Type and boundary.
export async function uploadMedia(formData: FormData) {
  return request<MediaAsset>(MEDIA_ENDPOINT, {
    method: "POST",
    body: formData,
  });
}

export async function updateMedia(
  id: string,
  data: { name?: string; altText?: string },
) {
  return request<MediaAsset>(
    `${MEDIA_ENDPOINT}/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteMedia(id: string, force = false) {
  const query = force ? "?force=true" : "";
  return request<{ success: boolean }>(
    `${MEDIA_ENDPOINT}/${encodeURIComponent(id)}${query}`,
    { method: "DELETE" },
  );
}
