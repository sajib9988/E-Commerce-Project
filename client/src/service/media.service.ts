"use server";

import { MediaAsset } from "@/type/cms";
import { parseResponse, safeFetch } from "@/utils/api-helpers";

const MEDIA_ENDPOINT = "/cms/media";

export async function getAllMedia() {
  return parseResponse<MediaAsset[]>(await safeFetch(MEDIA_ENDPOINT));
}

export async function getMediaById(id: string) {
  return parseResponse<MediaAsset>(
    await safeFetch(`${MEDIA_ENDPOINT}/${encodeURIComponent(id)}`),
  );
}

// formData-তে "file" (আবশ্যক) আর "altText" (ঐচ্ছিক)
export async function uploadMedia(formData: FormData) {
  return parseResponse<MediaAsset>(
    await safeFetch(MEDIA_ENDPOINT, { method: "POST", body: formData }),
  );
}

export async function updateMedia(
  id: string,
  data: { name?: string; altText?: string },
) {
  return parseResponse<MediaAsset>(
    await safeFetch(`${MEDIA_ENDPOINT}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  );
}

export async function deleteMedia(id: string, force = false) {
  return parseResponse<{ success: boolean }>(
    await safeFetch(
      `${MEDIA_ENDPOINT}/${encodeURIComponent(id)}${force ? "?force=true" : ""}`,
      { method: "DELETE" },
    ),
  );
}