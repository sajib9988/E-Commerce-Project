
"use server";




import { BlockType, ContentBlock } from "@/type/cms";
import { parseResponse, safeFetch } from "@/utils/api-helpers";

const BLOCK_ENDPOINT = `${process.env.NEXT_PUBLIC_BASE_URL}/cms/blocks`;

// GET ALL BLOCKS BY SECTION
export async function getBlocksBySection(sectionId: string) {
  return parseResponse
  <{
    success: boolean;
    data: ContentBlock[];
  }>(
    await safeFetch(
      `${BLOCK_ENDPOINT}/section/${sectionId}`
    )
  );
}

// GET BLOCK BY ID
export async function getBlockById(id: string) {
  return parseResponse<ContentBlock>(
    await safeFetch(`${BLOCK_ENDPOINT}/${id}`)
  );
}

// CREATE BLOCK
export async function createBlock(data: {
  sectionId: string;
  type: BlockType;
  content?: Record<string, unknown>;
  settings?: ContentBlock["settings"];
}) {
  return parseResponse(
    await safeFetch(BLOCK_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    })
  );
}

// UPDATE BLOCK
export async function updateBlock(
  id: string,
  data: Partial<
    Pick<
      ContentBlock,
      "type" | "content" | "settings" | "isVisible" | "sortOrder"
    >
  >
) {
  return parseResponse(
    await safeFetch(`${BLOCK_ENDPOINT}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  );
}

// DELETE BLOCK
export async function deleteBlock(id: string) {
  return parseResponse(
    await safeFetch(`${BLOCK_ENDPOINT}/${id}`, {
      method: "DELETE",
    })
  );
}

// DUPLICATE BLOCK
export async function duplicateBlock(id: string) {
  return parseResponse(
    await safeFetch(`${BLOCK_ENDPOINT}/${id}/duplicate`, {
      method: "POST",
    })
  );
}

// REORDER BLOCKS
export async function reorderBlocks(
  sectionId: string,
  blockIds: string[]
) {
  return parseResponse(
    await safeFetch(
      `${BLOCK_ENDPOINT}/section/${sectionId}/reorder`,
      {
        method: "PATCH",
        body: JSON.stringify({ blockIds }),
      }
    )
  );
}
