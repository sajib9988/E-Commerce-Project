"use client";

import { useMemo, useState, useTransition } from "react";
import { moderateReview, type AdminReview } from "@/service/review.service";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
type ApiError = { success: false; message?: string };

function isError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && (value as ApiError).success === false;
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminReviewsClient({ initialReviews }: { initialReviews: AdminReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<StatusFilter>("PENDING");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleReviews = useMemo(
    () => filter === "ALL" ? reviews : reviews.filter((review) => review.status === filter),
    [filter, reviews],
  );
  const counts = useMemo(() => ({
    ALL: reviews.length,
    PENDING: reviews.filter((review) => review.status === "PENDING").length,
    APPROVED: reviews.filter((review) => review.status === "APPROVED").length,
    REJECTED: reviews.filter((review) => review.status === "REJECTED").length,
  }), [reviews]);

  function moderate(review: AdminReview, status: "APPROVED" | "REJECTED") {
    const note = (notes[review.id] ?? "").trim();
    if (status === "REJECTED" && note.length < 3) {
      setErrors((old) => ({ ...old, [review.id]: "A rejection reason of at least 3 characters is required." }));
      return;
    }
    setErrors((old) => ({ ...old, [review.id]: "" }));
    setMessage("");
    startTransition(async () => {
      const result = await moderateReview(review.id, { status, note: note || undefined });
      if (isError(result)) {
        setErrors((old) => ({ ...old, [review.id]: result.message || "Review moderation failed." }));
        return;
      }
      setReviews((old) => old.map((item) => item.id === review.id ? { ...item, status } : item));
      setMessage("Review " + status.toLowerCase() + " successfully.");
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-slate-500">Customer feedback</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Review management</h1>
        <p className="text-sm text-slate-600">Only verified purchasers can submit product reviews. Approve suitable reviews or reject them with a clear reason.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as StatusFilter[]).map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)}
            className={"rounded-full border px-4 py-2 text-sm font-medium " + (filter === status ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            {status === "ALL" ? "All reviews" : status.charAt(0) + status.slice(1).toLowerCase()} ({counts[status]})
          </button>
        ))}
      </div>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}

      {visibleReviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No {filter === "ALL" ? "" : filter.toLowerCase() + " "}reviews found.
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleReviews.map((review) => (
            <article key={review.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{review.product.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{review.user.name || "Customer"} · {review.user.email}</p>
                  <p className="mt-1 text-xs text-slate-400">Order {review.order.orderNumber} · {date(review.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p aria-label={review.rating + " out of 5 stars"} className="font-semibold text-amber-600">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  <span className={"mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold " + (review.status === "PENDING" ? "bg-amber-50 text-amber-800" : review.status === "APPROVED" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{review.status}</span>
                </div>
              </div>
              {review.title && <h2 className="text-base font-semibold text-slate-900">{review.title}</h2>}
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.body}</p>
              {review.status === "PENDING" && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <textarea value={notes[review.id] ?? ""} onChange={(event) => setNotes((old) => ({ ...old, [review.id]: event.target.value }))}
                    rows={2} maxLength={500} placeholder="Optional approval note; required rejection reason (3–500 characters)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
                  {errors[review.id] && <p role="alert" className="text-sm text-rose-700">{errors[review.id]}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={pending} onClick={() => moderate(review, "APPROVED")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve review</button>
                    <button type="button" disabled={pending} onClick={() => moderate(review, "REJECTED")} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Reject review</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
