"use client";

import { useState, useTransition } from "react";
import { deleteMyReview, updateMyReview, type MyReview } from "@/service/review.service";

function isError(value: unknown): value is { success: false; message?: string } {
  return typeof value === "object" && value !== null && "success" in value && (value as { success?: boolean }).success === false;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function CustomerReviewsClient({ initialReviews }: { initialReviews: MyReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function beginEdit(review: MyReview) {
    setEditingId(review.id);
    setRating(review.rating);
    setTitle(review.title ?? "");
    setBody(review.body);
    setError("");
    setMessage("");
  }

  function saveEdit(review: MyReview) {
    if (body.trim().length < 10) {
      setError("Review text must contain at least 10 characters.");
      return;
    }
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await updateMyReview(review.id, { rating, title: title.trim() || undefined, body: body.trim() });
      if (isError(result)) {
        setError(result.message ?? "Could not update review.");
        return;
      }
      setReviews((old) => old.map((item) => item.id === review.id ? { ...item, rating, title: title.trim() || null, body: body.trim(), status: "PENDING", updatedAt: new Date().toISOString() } : item));
      setEditingId(null);
      setMessage("Review updated. It may return to moderation before appearing publicly.");
    });
  }

  function removeReview(review: MyReview) {
    if (!window.confirm("Delete this review? This action cannot be undone.")) return;
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await deleteMyReview(review.id);
      if (isError(result)) {
        setError(result.message ?? "Could not delete review.");
        return;
      }
      setReviews((old) => old.filter((item) => item.id !== review.id));
      setMessage("Review deleted.");
    });
  }

  return (
    <div className="space-y-5">
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold">You have not written any reviews yet</h2>
          <p className="mt-2 text-sm text-stone-600">After purchasing an eligible product, you can submit a verified-purchase review from its product page.</p>
          <a href="/products" className="mt-5 inline-flex rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">Browse products</a>
        </div>
      ) : reviews.map((review) => (
        <article key={review.id} className="rounded-2xl border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{review.product?.name ?? "Product review"}</h2>
              <p className="mt-1 text-sm text-amber-600" aria-label={review.rating + " out of 5 stars"}>{"★".repeat(review.rating)}{"☆".repeat(Math.max(0, 5 - review.rating))}</p>
            </div>
            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (review.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" : review.status === "REJECTED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700")}>{review.status}</span>
          </div>
          {editingId === review.id ? (
            <div className="mt-4 space-y-3">
              <label className="grid gap-1 text-sm font-medium">Rating
                <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="rounded-lg border border-stone-300 px-3 py-2">
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium">Title (optional)
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm font-medium">Review
                <textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={10} maxLength={3000} rows={5} className="rounded-lg border border-stone-300 px-3 py-2" required />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => saveEdit(review)} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save changes</button>
                <button type="button" disabled={pending} onClick={() => setEditingId(null)} className="rounded-lg border px-4 py-2 text-sm font-semibold">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {review.title && <h3 className="mt-3 font-medium">{review.title}</h3>}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">{review.body}</p>
              {review.status === "REJECTED" && review.moderationNote && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Moderator note: {review.moderationNote}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-stone-400">Submitted {formatDate(review.createdAt)}{review.updatedAt !== review.createdAt ? " · Updated " + formatDate(review.updatedAt) : ""}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={pending} onClick={() => beginEdit(review)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">Edit</button>
                  <button type="button" disabled={pending} onClick={() => removeReview(review)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
                </div>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}
