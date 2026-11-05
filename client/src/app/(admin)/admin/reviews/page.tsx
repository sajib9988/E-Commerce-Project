import { getAdminReviews } from "@/service/review.service";

export default async function AdminReviewsPage() {
  const result = await getAdminReviews();
  const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500">Store management</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Product reviews</h1>
        <p className="mt-2 text-sm text-slate-600">Review customer feedback and monitor moderation status.</p>
      </header>
      {failed ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load reviews: {result.message}</p>
      ) : result.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No customer reviews found.</div>
      ) : (
        <div className="space-y-3">
          {result.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="font-semibold text-slate-900">{review.product.name}</h2><p className="mt-1 text-sm text-slate-500">{review.user.name ?? "Customer"} · {review.user.email}</p></div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{review.status}</span>
              </div>
              <p className="mt-3 text-sm text-amber-600">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
              {review.title && <h3 className="mt-2 font-medium text-slate-900">{review.title}</h3>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.body}</p>
              <p className="mt-3 text-xs text-slate-400">Order {review.order.orderNumber} · {new Date(review.createdAt).toLocaleDateString("en-US")}</p>
              {review.status === "PENDING" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Pending moderation. Approval and rejection actions can be added to this queue.</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
