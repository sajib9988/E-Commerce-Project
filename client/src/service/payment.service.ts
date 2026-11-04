"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = { success: false; message: string; statusCode?: number };

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson<T>(response: Response): Promise<T | ApiError> {
  try { return (await response.json()) as T; }
  catch { return { success: false, message: "Invalid JSON response from server" }; }
}

function isApiError(value: unknown): value is ApiError {\n  return typeof value === "object" && value !== null && "statusCode" in value;\n}\n\nasync function request<T>(path: string, options: RequestInit = {}): Promise<T | ApiError> {
  if (!BASE_URL) return { success: false, message: "NEXT_PUBLIC_BASE_URL is not configured" };
  try {
    const response = await fetch(`${BASE_URL.replace(/\/+$/, "")}${path}`, {
      ...options, headers: await getAuthHeaders(), cache: "no-store",
    });
    const result = await safeJson<T>(response);
    if (!response.ok) {
      const message = typeof result === "object" && result !== null && "message" in result
        ? String(result.message) : `Request failed: ${response.status}`;
      return { success: false, statusCode: response.status, message };
    }
    return result;
  } catch (error) {
    console.error("Payment request failed:", error);
    return { success: false, message: "Unable to connect to the server" };
  }
}

// The backend currently exposes manual-review operations only; it does not expose
// a customer payment-history endpoint, so no unsupported endpoint is assumed.
export async function getPaymentsForManualReview() {
  return request("/payments/manual-review", { method: "GET" });
}

export async function resolvePaymentManualReview(
  attemptId: string,
  data: { decision: string; note?: string },
) {
  const result = await request(`/payments/manual-review/${encodeURIComponent(attemptId)}/resolve`, {
    method: "POST", body: JSON.stringify(data),
  });
  if (!isApiError(result)) revalidatePath("/admin/payments");
  return result;
}
