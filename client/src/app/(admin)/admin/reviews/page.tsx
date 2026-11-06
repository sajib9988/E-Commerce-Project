import { AdminReviewsClient } from "@/components/admin/admin-reviews-client";
import { getAdminReviews, type AdminReview } from "@/service/review.service";

export default async function AdminReviewsPage() {
  const result = await getAdminReviews();
  if (typeof result === "object" && result !== null && "success" in result && result.success === false) {
    return <div className="space-y-4"><h1 className="text-3xl font-bold">Review management</h1><p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{String(result.message)}</p></div>;
  }
  return <AdminReviewsClient initialReviews={Array.isArray(result) ? result as AdminReview[] : []} />;
}
