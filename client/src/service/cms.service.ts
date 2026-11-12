"use server";

import { apiRequest } from "@/lib/api/server-request";

import type { CmsPage, CmsPageListItem, UpdatePageInput } from "@/type/cms";

const PAGE_ENDPOINT = "/cms/pages";

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};





async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { context: "cms request" });
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
