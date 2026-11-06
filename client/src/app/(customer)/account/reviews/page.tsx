import { getMyReviews } from "@/service/review.service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export default async function CustomerReviewsPage() {
  const result = await getMyReviews();
  const reviews = Array.isArray(result) ? result : [];
  const error = Array.isArray(result) ? null : result;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-medium text-slate-500">Your account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">My reviews</h1>
        <p className="mt-2 text-sm text-slate-600">See the product reviews you have submitted and their moderation status.</p>
      </header>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Could not load your reviews: {error.message}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-900">You have not written any reviews yet</h2>
          <p className="mt-2 text-sm text-slate-600">After purchasing an eligible product, you can submit a verified-purchase review from its product page.</p>
          <a href="/products" className="mt-5 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Browse products</a>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{review.product.name}</h2>
                  <p className="mt-1 text-sm text-amber-600" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${review.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : review.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{review.status}</span>
              </div>
              {review.title && <h3 className="mt-4 font-medium text-slate-900">{review.title}</h3>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.body}</p>
              {review.status === "REJECTED" && review.moderationNote && (
                <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Moderator note: {review.moderationNote}</p>
              )}
              <p className="mt-4 text-xs text-slate-400">Submitted {formatDate(review.createdAt)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
