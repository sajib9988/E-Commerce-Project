import { getCoupons } from "@/service/coupon.service";

function discountLabel(type: string, value: string) {
  if (type === "PERCENT") return `${value}% off`;
  if (type === "FREE_SHIPPING") return "Free shipping";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export default async function AdminCouponsPage() {
  const result = await getCoupons();
  const coupons = Array.isArray(result) ? result : [];
  const error = Array.isArray(result) ? null : result;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500">Store management</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Coupons</h1>
        <p className="mt-2 text-sm text-slate-600">Review promotion codes, usage and activation status.</p>
      </header>
      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load coupons: {error.message}</p>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No coupons created yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Code</th><th className="px-5 py-3">Discount</th><th className="px-5 py-3">Usage</th><th className="px-5 py-3">Expires</th><th className="px-5 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-5 py-4 font-semibold text-slate-900">{coupon.code}</td>
                  <td className="px-5 py-4 text-slate-700">{discountLabel(coupon.type, coupon.value)}</td>
                  <td className="px-5 py-4 text-slate-600">{coupon.usageCount}{coupon.usageLimit === null ? " / Unlimited" : ` / ${coupon.usageLimit}`}</td>
                  <td className="px-5 py-4 text-slate-600">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("en-US") : "No expiry"}</td>
                  <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coupon.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{coupon.isActive ? "Active" : "Disabled"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
