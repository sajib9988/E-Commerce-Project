import Link from "next/link";
import { getMyRefundRequests } from "@/service/refund.service";

type Row = Record<string, any>;
const money = (v: unknown, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
const date = (v: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(v));
const tone = (s: string) => s === "REFUNDED" ? "bg-emerald-50 text-emerald-700" : s === "REJECTED" || s === "FAILED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800";

export default async function CustomerRefundsPage() {
  const result = await getMyRefundRequests();
  const failed = !!result && typeof result === "object" && "success" in result && (result as any).success === false;
  const refunds: Row[] = !failed && Array.isArray(result) ? result as Row[] : [];
  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">After-sales support</p><h1 className="mt-1 text-3xl font-semibold">Refund requests</h1><p className="mt-2 text-sm text-stone-500">See the review and processing status of your refund requests.</p></header>
    {failed ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{String((result as any).message ?? "Unable to load refund requests")}</p> :
      refunds.length ? <div className="space-y-3">{refunds.map((refund) => <article key={refund.id} className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{refund.order?.orderNumber ?? refund.orderId}</p><p className="mt-1 text-xs text-stone-500">Submitted {date(refund.createdAt)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone(refund.status)}`}>{refund.status}</span></div><div className="mt-4 flex flex-wrap justify-between gap-2 text-sm"><span className="text-stone-500">{refund.reason}</span><b>{money(refund.amount, refund.order?.currency ?? "USD")}</b></div>{refund.adminNote && <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">Store team note: {refund.adminNote}</p>}<Link href={`/account/orders/${refund.orderId}`} className="mt-4 inline-block text-sm font-semibold underline">View order</Link></article>)}</div> :
      <div className="rounded-2xl border border-dashed bg-white p-12 text-center"><h2 className="font-semibold">No refund requests</h2><p className="mt-2 text-sm text-stone-500">If you need help with an eligible order, open its details to submit a request.</p></div>}
  </div>;
}
