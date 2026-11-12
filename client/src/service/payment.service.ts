"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";

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
  return apiRequest<T>(path, options, { context: "payment request" });
}

/**
 * Admin/Super Admin: fetch payment attempts that need manual review.
 * Backend route: GET /payments/manual-review
 */
export async function getAdminPayments(params: { page?: number; limit?: number; status?: string } = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/payments/admin${suffix}`);
}

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
