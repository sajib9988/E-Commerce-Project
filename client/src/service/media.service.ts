"use server";

import { apiRequest } from "@/lib/api/server-request";

import type { MediaAsset, MediaUsage } from "@/type/cms";

const MEDIA_ENDPOINT = "/cms/media";

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};





async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { context: "Media request" });
}

export async function getAllMedia() {
  return request<MediaAsset[]>(MEDIA_ENDPOINT);
}

export async function getMediaById(id: string) {
  return request<MediaAsset>(
    `${MEDIA_ENDPOINT}/${encodeURIComponent(id)}`,
  );
}

// Backend reports CMS pages that reference this media asset.
export async function getMediaUsage(id: string) {
  return request<MediaUsage>(
    `${MEDIA_ENDPOINT}/${encodeURIComponent(id)}/usage`,
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
