"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
type ApiError = { success: false; message: string; statusCode?: number };
export type InventoryAdjustment = {
 id: string; quantityDelta: number; quantityBefore: number; quantityAfter: number; reason: string; createdAt: string;
 actor: { id: string; name: string; email: string };
 product?: { id: string; name: string; sku?: string | null } | null;
 variant?: { id: string; sku: string; colorName?: string | null; size?: { label: string } | null; product?: { id: string; name: string } | null } | null;
};
export type InventoryAdjustmentInput = { productId?: string; variantId?: string; direction: "INCREASE" | "DECREASE"; quantity: number; reason: string };
async function request<T>(path: string, options: RequestInit = {}): Promise<T | ApiError> {
 if (!BASE_URL) return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
 try {
  const store = await cookies(), token = store.get("accessToken")?.value;
  const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }, cache: "no-store" });
  let data: T | ApiError;
  try { data = await response.json() as T; } catch { data = { success: false, message: "Invalid JSON response from server" }; }
  if (!response.ok) return { success: false, statusCode: response.status, message: typeof data === "object" && data !== null && "message" in data ? String(data.message) : `Request failed: ${response.status}` };
  return data;
 } catch (error) { console.error("Inventory request failed:", error); return { success: false, message: "Unable to connect to the server" }; }
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