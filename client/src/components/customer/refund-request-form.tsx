"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createRefundRequest } from "@/service/refund.service";

type Props = { orderId: string };

export function RefundRequestForm({ orderId }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason || customerNote.trim().length < 10 || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const result = await createRefundRequest(orderId, {
        reason,
        customerNote: customerNote.trim(),
      });

      if (result && typeof result === "object" && "success" in result && result.success === false) {
        setFeedback({ type: "error", message: result.message || "Your refund request could not be submitted." });
        return;
      }

      setFeedback({ type: "success", message: "Your refund request was submitted successfully. You can track its status in your account." });
      setReason("");
      setCustomerNote("");
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "Unable to submit your refund request. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
      <label className="grid gap-1 text-sm font-medium">
        Reason
        <select value={reason} onChange={(event) => setReason(event.target.value)} required className="rounded-lg border border-stone-300 px-3 py-2 font-normal">
          <option value="">Choose a reason</option>
          <option value="Changed my mind">Changed my mind</option>
          <option value="Ordered by mistake">Ordered by mistake</option>
          <option value="Incorrect order details">Incorrect order details</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Additional note *
        <textarea value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} rows={3} minLength={10} maxLength={1000} required className="rounded-lg border border-stone-300 px-3 py-2 font-normal" placeholder="Please explain your request (at least 10 characters)" />
      </label>
      {feedback && (
        <p role={feedback.type === "error" ? "alert" : "status"} className={feedback.type === "error" ? "rounded-lg bg-rose-50 p-3 text-sm text-rose-700" : "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"}>
          {feedback.message}
        </p>
      )}
      <button type="submit" disabled={isSubmitting || !reason || customerNote.trim().length < 10} className="w-fit rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {isSubmitting ? "Submitting..." : "Submit refund request"}
      </button>
    </form>
  );
}
