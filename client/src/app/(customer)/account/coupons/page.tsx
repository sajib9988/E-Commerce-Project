import { getAvailableCoupons } from "@/service/coupon.service";

function formatAmount(value: string, type: "PERCENT" | "FIXED" | "FREE_SHIPPING") {
  if (type === "PERCENT") return `${value}% off`;
  if (type === "FREE_SHIPPING") return "Free shipping";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "No expiry date";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export default async function CustomerCouponsPage() {
  const result = await getAvailableCoupons();
  const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-medium text-slate-500">Your account</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Available coupons</h1>
        <p className="mt-2 text-sm text-slate-600">Promotion codes currently available to your account.</p>
      </header>

      {failed ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Could not load coupons: {result.message}
        </div>
      ) : result.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="font-semibold text-slate-900">No coupons available right now</h2>
          <p className="mt-2 text-sm text-slate-600">Check back later. New promotions will appear here when they are active.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {result.map((coupon) => (
            <article key={coupon.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Promotion code</p>
                  <h2 className="mt-1 text-xl font-bold tracking-wide text-slate-950">{coupon.code}</h2>
                </div>
                <button type="button" onClick={undefined} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700" aria-label={`Coupon code ${coupon.code}`}>Use at checkout</button>
              </div>
              <p className="mt-4 text-2xl font-bold text-emerald-700">{formatAmount(coupon.value, coupon.type)}</p>
              {coupon.minOrderAmount && <p className="mt-2 text-sm text-slate-600">Minimum order: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(coupon.minOrderAmount))}</p>}
              <p className="mt-3 text-xs text-slate-500">Expires: {formatDate(coupon.expiresAt)}</p>
              <p className="mt-3 text-xs leading-5 text-slate-400">Final eligibility and discount are verified by the server during checkout.</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
