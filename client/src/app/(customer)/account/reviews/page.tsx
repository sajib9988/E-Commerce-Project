"use server";

import { CustomerReviewsClient } from "@/components/customer/customer-reviews-client";
import { getMyReviews, type MyReview } from "@/service/review.service";

export default async function CustomerReviewsPage() {
  const result = await getMyReviews();
  const failed = !Array.isArray(result);
  const reviews = failed ? [] : result as MyReview[];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-stone-500">Your account</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-950">My reviews</h1>
        <p className="mt-2 text-sm text-stone-600">View, update or delete your submitted product reviews.</p>
      </header>
      {failed ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load your reviews: {String((result as { message?: string }).message ?? "Unknown error")}</div> : <CustomerReviewsClient initialReviews={reviews} />}
    </div>
  );
}
