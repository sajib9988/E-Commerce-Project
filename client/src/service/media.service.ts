
"use server";




import { MediaAsset, MediaType } from "@/type/cms";
import { parseResponse, safeFetch } from "@/utils/api-helpers";

const MEDIA_ENDPOINT = `${process.env.NEXT_PUBLIC_BASE_URL}/cms/media`;

// MEDIA LIBRARY

// GET ALL MEDIA
export async function getAllMedia() {
  return parseResponse<{
    success: boolean;
    data: MediaAsset[];
    message?: string;
  }>(
    await safeFetch(MEDIA_ENDPOINT)
  );
}

// GET MEDIA BY ID
export async function getMediaById(id: string) {
  return parseResponse<MediaAsset>(
    await safeFetch(`${MEDIA_ENDPOINT}/${id}`)
  );
}

// UPLOAD MEDIA
export async function uploadMedia(
  file: File,
  options?: {
    type?: MediaType;
    altText?: string;
  }
) {
  const formData = new FormData();

  formData.append("file", file);

  if (options?.type) {
    formData.append("type", options.type);
  }

  if (options?.altText) {
    formData.append("altText", options.altText);
  }

  return parseResponse<{
    success: boolean;
    data: MediaAsset;
    message?: string;
  }>(
    await safeFetch(MEDIA_ENDPOINT, {
      method: "POST",
      body: formData,
    })
  );
}

// UPDATE MEDIA
export async function updateMedia(
  id: string,
  data: {
    name?: string;
    altText?: string;
  }
) {
  return parseResponse(
    await safeFetch(`${MEDIA_ENDPOINT}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  );
}

// DELETE MEDIA
export async function deleteMedia(id: string) {
  return parseResponse(
    await safeFetch(`${MEDIA_ENDPOINT}/${id}`, {
      method: "DELETE",
    })
  );
}
