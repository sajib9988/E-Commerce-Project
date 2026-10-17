"use server";

import { cookies } from "next/headers";
import type { CmsPage, CmsPageListItem, UpdatePageInput } from "@/type/cms";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const PAGE_ENDPOINT = "/cms/pages";

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
    console.error("CMS request failed:", error);
    return {
      success: false,
      message: "Unable to connect to the server",
    };
  }
}

export async function getAllPages() {
  // Backend list intentionally returns a lightweight summary with _count,
  // while getPageById/create/update return the full page tree.
  return request<CmsPageListItem[]>(PAGE_ENDPOINT);
}

export async function getPageById(id: string) {
  return request<CmsPage>(`${PAGE_ENDPOINT}/${encodeURIComponent(id)}`);
}

export async function getPageBySlug(slug: string) {
  return request<CmsPage>(
    `${PAGE_ENDPOINT}/slug/${encodeURIComponent(slug)}`,
  );
}

export async function createPage(data: {
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  publishAt?: string;
}) {
  return request<CmsPage>(PAGE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePage(id: string, data: UpdatePageInput) {
  return request<CmsPage>(`${PAGE_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function publishPage(id: string) {
  return request<CmsPage>(
    `${PAGE_ENDPOINT}/${encodeURIComponent(id)}/publish`,
    { method: "PATCH" },
  );
}

export async function deletePage(id: string) {
  return request<{ success: boolean }>(
    `${PAGE_ENDPOINT}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

// Sections and blocks are saved as part of the page tree through updatePage().
// Do not call /cms/sections: the current NestJS backend has no such controller.
