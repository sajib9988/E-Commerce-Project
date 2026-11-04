"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

type ApiError = {
  success: false;
  message: string;
  statusCode?: number;
};

export type ManualReviewDecision = "REFUND" | "RESOLVE_NO_REFUND";

export type PaymentManualReviewItem = {
  id: string;
  orderId: string;
  provider: string;
  status: string;
  amount: string;
  currency: string;
  requiresManualReview: boolean;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    currency: string;
    userId: string;
  };
};

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function safeJson<T>(response: Response): Promise<T | ApiError> {
  try {
    return (await response.json()) as T;
  } catch {
    return { success: false, message: "Invalid JSON response from server" };
  }
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === false
  );
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | ApiError> {
  if (!BASE_URL) {
    return {
      success: false,
      message: "NEXT_PUBLIC_BASE_URL is not configured",
    };
  }

  try {
    const response = await fetch(
      `${BASE_URL.replace(/\\/+$/, "")}${path}`,
      {
        ...options,
        headers: await getAuthHeaders(),
        cache: "no-store",
      },
    );

    const result = await safeJson<T>(response);

    if (!response.ok) {
      const message =
        typeof result === "object" && result !== null && "message" in result
          ? String(result.message)
          : `Request failed: ${response.status}`;

      return { success: false, statusCode: response.status, message };
    }

    return result;
  } catch (error) {
    console.error("Payment request failed:", error);
    return {
      success: false,
      message: "Unable to connect to the server",
    };
  }
}

/**
 * Admin/Super Admin: fetch payment attempts that need manual review.
 * Backend route: GET /payments/manual-review
 */
export async function getPaymentsForManualReview() {
  return request<PaymentManualReviewItem[]>("/payments/manual-review", {
    method: "GET",
  });
}

/**
 * Admin/Super Admin: resolve a payment attempt after reviewing it.
 * Backend route: POST /payments/manual-review/:attemptId/resolve
 */
export async function resolvePaymentManualReview(
  attemptId: string,
  data: { decision: ManualReviewDecision; note: string },
) {
  const result = await request<PaymentManualReviewItem>(
    `/payments/manual-review/${encodeURIComponent(attemptId)}/resolve`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!isApiError(result)) {
    revalidatePath("/admin/payments");
  }

  return result;
}
