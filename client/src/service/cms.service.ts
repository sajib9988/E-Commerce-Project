
"use server";

import { CmsPage, CmsSection } from "@/type/cms";
import { parseResponse, safeFetch } from "@/utils/api-helpers";



const PAGE_ENDPOINT = "/cms/pages";
const SECTION_ENDPOINT = "/cms/sections";

//PAGES 

export async function getAllPages() {
  return parseResponse<{
    success: boolean;
    data: CmsPage[];
    message?: string;
  }>(await safeFetch(PAGE_ENDPOINT));
}

export async function getPageById(id: string) {
  return parseResponse<CmsPage>(
    await safeFetch(
      `${PAGE_ENDPOINT}/${encodeURIComponent(id)}`,
    ),
  );
}

export async function getPageBySlug(slug: string) {
  return parseResponse<CmsPage>(
    await safeFetch(
      `${PAGE_ENDPOINT}/slug/${encodeURIComponent(slug)}`,
    ),
  );
}

export async function createPage(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  return parseResponse(
    await safeFetch(PAGE_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );
}

export async function updatePage(
  id: string,
  data: Partial<
    Pick<CmsPage, "name" | "slug" | "description" | "status">
  >,
) {
  return parseResponse(
    await safeFetch(
      `${PAGE_ENDPOINT}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),
  );
}

export async function deletePage(id: string) {
  return parseResponse(
    await safeFetch(
      `${PAGE_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  );
}

export async function publishPage(id: string) {
  return parseResponse(
    await safeFetch(
      `${PAGE_ENDPOINT}/${encodeURIComponent(id)}/publish`,
      { method: "PATCH" },
    ),
  );
}

//  SECTIONS

export async function getAllSections() {
  return parseResponse(
    await safeFetch(SECTION_ENDPOINT),
  );
}

export async function getSectionsByPage(pageId: string) {
  return parseResponse<{
    success: boolean;
    data: CmsSection[];
  }>(
    await safeFetch(
      `${SECTION_ENDPOINT}/page/${encodeURIComponent(pageId)}`,
    ),
  );
}

export async function getSectionById(id: string) {
  return parseResponse<CmsSection>(
    await safeFetch(
      `${SECTION_ENDPOINT}/${encodeURIComponent(id)}`,
    ),
  );
}

export async function createSection(data: {
  pageId: string;
  name: string;
  settings?: CmsSection["settings"];
}) {
  return parseResponse(
    await safeFetch(SECTION_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  );
}

export async function updateSection(
  id: string,
  data: Partial<
    Pick<
      CmsSection,
      "name" | "settings" | "isVisible" | "sortOrder"
    >
  >,
) {
  return parseResponse(
    await safeFetch(
      `${SECTION_ENDPOINT}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    ),
  );
}

export async function deleteSection(id: string) {
  return parseResponse(
    await safeFetch(
      `${SECTION_ENDPOINT}/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ),
  );
}

export async function reorderSections(
  pageId: string,
  sectionIds: string[],
) {
  return parseResponse(
    await safeFetch(
      `${SECTION_ENDPOINT}/page/${encodeURIComponent(pageId)}/reorder`,
      {
        method: "PATCH",
        body: JSON.stringify({ sectionIds }),
      },
    ),
  );
}
