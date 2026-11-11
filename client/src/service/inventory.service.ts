"use server";

import { apiRequest } from "@/lib/api/server-request";
import { revalidatePath } from "next/cache";
type ApiError = { success: false; message: string; statusCode?: number };
export type InventoryAdjustment = {
 id: string; quantityDelta: number; quantityBefore: number; quantityAfter: number; reason: string; createdAt: string;
 actor: { id: string; name: string; email: string };
 product?: { id: string; name: string; sku?: string | null } | null;
 variant?: { id: string; sku: string; colorName?: string | null; size?: { label: string } | null; product?: { id: string; name: string } | null } | null;
};
export type InventoryAdjustmentInput = { productId?: string; variantId?: string; direction: "INCREASE" | "DECREASE"; quantity: number; reason: string };
async function request<T>(path: string, options: RequestInit = {}): Promise<T | ApiError> {
  return apiRequest<T>(path, options, { context: "inventory request" });
}
function isApiError(value: unknown): value is ApiError { return typeof value === "object" && value !== null && "success" in value && value.success === false; }
export async function getInventoryAdjustments(page = 1, limit = 50) {
 return request<{ items: InventoryAdjustment[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/inventory/adjustments?page=${page}&limit=${limit}`);
}
export async function createInventoryAdjustment(data: InventoryAdjustmentInput) {
 const result = await request<InventoryAdjustment>("/inventory/adjustments", { method: "POST", body: JSON.stringify(data) });
 if (!isApiError(result)) { revalidatePath("/admin/inventory"); revalidatePath("/admin/products"); revalidatePath("/admin/variants"); }
 return result;
}