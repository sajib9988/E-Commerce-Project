"use server";

import { revalidatePath } from "next/cache";

import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const PRODUCT_ENDPOINT = "/products";

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

type ProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  collection?: string;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  minPrice?: number;
  maxPrice?: number;
};

type AdminProductQuery = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

const isApiError = (value: unknown): value is ApiError => {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false
  );
};

const buildQuery = (params: object) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  });

  return query.toString() ? `?${query.toString()}` : "";
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T | ApiError> => {
  if (!BASE_URL) {
    return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  }

  try {
    const isFormData = options.body instanceof FormData;
    const authHeaders = authenticated
      ? await getAuthHeaders(!isFormData)
      : {};

    const headers = new Headers(authHeaders);
    new Headers(options.headers).forEach((value, key) => headers.set(key, value));

    const res = await fetch(`${BASE_URL.replace(/\/+$/, "")}${endpoint}`, {
      ...options,
      headers,
      ...(options.cache || options.next ? {} : { cache: "no-store" }),
    });

    const result = await safeJson<T | ApiError>(res);

    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        message:
          result && typeof result === "object" && "message" in result
            ? String(result.message)
            : "Request failed",
      };
    }

    return result as T;
  } catch (error) {
    console.error("Product request failed:", error);
    return { success: false, message: "Failed to process product request" };
  }
};

const revalidateProductPages = () => {
  revalidatePath("/admin/products");
  revalidatePath("/admin/variants");
};

export const getProducts = async (params: ProductQuery = {}) => {
  return request(
    `${PRODUCT_ENDPOINT}${buildQuery(params)}`,
    { next: { revalidate: 60 } },
    false,
  );
};

export const getProductById = async (id: string) => {
  return request(
    `${PRODUCT_ENDPOINT}/${encodeURIComponent(id)}`,
    { next: { revalidate: 60 } },
    false,
  );
};

export const getAdminProducts = async (params: AdminProductQuery = {}) => {
  return request(`${PRODUCT_ENDPOINT}/admin/list${buildQuery(params)}`);
};

export const getAdminProductById = async (id: string) => {
  return request(`${PRODUCT_ENDPOINT}/admin/${encodeURIComponent(id)}`);
};

export const createProduct = async (formData: FormData) => {
  const result = await request(PRODUCT_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const updateProduct = async (id: string, formData: FormData) => {
  const result = await request(
    `${PRODUCT_ENDPOINT}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: formData },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
    revalidatePath(`/products/${id}`);
  }

  return result;
};

export const deleteProduct = async (id: string) => {
  const result = await request(
    `${PRODUCT_ENDPOINT}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const getProductVariants = async (productId: string) => {
  return request(
    `${PRODUCT_ENDPOINT}/${encodeURIComponent(productId)}/variants`,
    { next: { revalidate: 60 } },
    false,
  );
};

export const getAdminProductVariants = async (productId: string) => {
  return request(
    `${PRODUCT_ENDPOINT}/${encodeURIComponent(productId)}/variants/admin`,
  );
};

export const createProductVariant = async (data: {
  productId: string;
  sizeId: string;
  sku: string;
  regularPrice: number;
  salePrice?: number | null;
  stockQuantity?: number;
  apliiqVariantSku?: string | null;
  colorName?: string | null;
  colorHex?: string | null;
  apliiqColorId?: string | null;
  isActive?: boolean;
}) => {
  const result = await request(`${PRODUCT_ENDPOINT}/variants`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const updateProductVariant = async (
  id: string,
  data: Record<string, unknown>,
) => {
  const result = await request(
    `${PRODUCT_ENDPOINT}/variants/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const archiveProductVariant = async (id: string) => {
  const result = await request(
    `${PRODUCT_ENDPOINT}/variants/${encodeURIComponent(id)}/archive`,
    { method: "PATCH" },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const getSizeTemplates = async (includeInactive = false) => {
  return request(
    `/size-templates${includeInactive ? "?includeInactive=true" : ""}`,
    { next: { revalidate: 60 } },
    false,
  );
};

export const createSizeTemplate = async (data: {
  name: string;
  slug: string;
  description?: string;
  sizes: Array<{ label: string; sortOrder?: number }>;
  isActive?: boolean;
}) => {
  const result = await request("/size-templates", {
    method: "POST",
    body: JSON.stringify(data),
  });

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const updateSizeTemplate = async (
  id: string,
  data: Record<string, unknown>,
) => {
  const result = await request(
    `/size-templates/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const addTemplateSize = async (
  id: string,
  data: { label: string; sortOrder?: number },
) => {
  const result = await request(
    `/size-templates/${encodeURIComponent(id)}/sizes`,
    { method: "POST", body: JSON.stringify(data) },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};

export const archiveTemplateSize = async (id: string, sizeId: string) => {
  const result = await request(
    `/size-templates/${encodeURIComponent(id)}/sizes/${encodeURIComponent(sizeId)}/archive`,
    { method: "PATCH" },
  );

  if (!isApiError(result)) {
    revalidateProductPages();
  }

  return result;
};
