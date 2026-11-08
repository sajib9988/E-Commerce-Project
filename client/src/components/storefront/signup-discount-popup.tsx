"use client";

import { useEffect, useState, type FormEvent } from "react";

type ActivePopup = {
  id: string;
  title: string | null;
  description: string | null;
  bannerImage: string | null;
  discountType: "PERCENTAGE" | "FIXED" | null;
  discountValue: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export function SignupDiscountPopup() {
  const [promotion, setPromotion] = useState<ActivePopup | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!API_BASE_URL) return;
    const controller = new AbortController();

    fetch(`${API_BASE_URL.replace(/\/+$/, "")}/promotions/active-popup`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as ActivePopup | null;
      })
      .then((data) => {
        if (data?.id) {
          setPromotion(data);
          setOpen(true);
        }
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof Error && fetchError.name !== "AbortError") {
          console.error("Could not load signup promotion:", fetchError);
        }
      });

    return () => controller.abort();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!API_BASE_URL) {
      setError("Signup is temporarily unavailable. Please try again later.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/+$/, "")}/newsletter/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, marketingConsent }),
        },
      );
      const data = (await response.json()) as { message?: string | string[] };
      if (!response.ok) {
        setError(Array.isArray(data.message) ? data.message.join(", ") : data.message || "Unable to submit your email.");
        return;
      }
      setMessage("Check your inbox — your unique welcome discount is on its way.");
      setEmail("");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !promotion) return null;

  const discount = promotion.discountValue
    ? Number(promotion.discountValue).toLocaleString("en-US", { maximumFractionDigits: 2 })
    : "20";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section
        aria-labelledby="signup-discount-title"
        aria-modal="true"
        className="relative grid w-full max-w-3xl overflow-hidden rounded-2xl bg-white text-neutral-950 shadow-2xl md:grid-cols-2"
        role="dialog"
      >
        <button
          aria-label="Close discount popup"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl text-neutral-800 shadow hover:bg-white"
          onClick={() => setOpen(false)}
          type="button"
        >
          ×
        </button>

        {promotion.bannerImage ? (
          <div
            aria-label="Promotional offer"
            className="min-h-48 bg-cover bg-center md:min-h-full"
            role="img"
            style={{ backgroundImage: `url("${promotion.bannerImage}")` }}
          />
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center bg-neutral-950 p-8 text-center text-white md:min-h-full">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-300">A little something for you</span>
            <span className="mt-3 text-6xl font-black">{discount}%</span>
            <span className="mt-1 text-sm font-semibold uppercase tracking-[0.2em]">off your first order</span>
          </div>
        )}

        <div className="flex flex-col justify-center p-7 sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">Welcome offer</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight" id="signup-discount-title">
            {promotion.title || `Get ${discount}% OFF your first order`}
          </h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            {promotion.description || "Enter your email and we'll send you a unique discount code."}
          </p>

          {message ? (
            <p className="mt-6 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">{message}</p>
          ) : (
            <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="signup-discount-email">Email address</label>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-lg border border-neutral-300 px-4 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
                id="signup-discount-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                required
                type="email"
                value={email}
              />
              <label className="flex items-start gap-2 text-xs leading-5 text-neutral-600">
                <input
                  checked={marketingConsent}
                  className="mt-1"
                  onChange={(event) => setMarketingConsent(event.target.checked)}
                  type="checkbox"
                />
                <span>Yes, I would also like to receive promotional emails. I can unsubscribe at any time. (Optional)</span>
              </label>
              {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
              <button
                className="h-12 w-full rounded-lg bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Sending..." : `Email Me My ${discount}% Code`}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-[11px] leading-4 text-neutral-500">
            One-time welcome code. Offer terms and expiry apply.
          </p>
        </div>
      </section>
    </div>
  );
}
