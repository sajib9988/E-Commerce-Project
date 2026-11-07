import Link from "next/link";
import { notFound } from "next/navigation";
import { getMyOrderById } from "@/service/order.service";
import { createRefundRequest } from "@/service/refund.service";

type Row = Record<string, any>;
const money = (v: unknown, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
const date = (v?: string | null) => v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "Not available";

export default async function CustomerOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMyOrderById(id);
  if (!result || typeof result !== "object" || ("success" in result && (result as any).success === false)) {
    if ((result as any)?.statusCode === 404) notFound();
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{String((result as any)?.message ?? "Unable to load this order")}</div>;
  }
  const order = result as Row;
  const fulfillment = (order.fulfillments ?? []).find((item: Row) => item.provider === "APLIIQ");
  const paymentAttempts: Row[] = order.paymentAttempts ?? [];
  const accepted = !!fulfillment?.externalOrderId || ["ACCEPTED","PROCESSING","IN_PRODUCTION","SHIPPED","SUCCESS"].includes(String(fulfillment?.providerStatus ?? "").toUpperCase());
  const canRequestRefund = order.paymentStatus === "PAID" && !["REFUNDED","CANCELLED"].includes(order.status) && !accepted;
  async function submitRefund(formData: FormData) {
    "use server";
    const reason = String(formData.get("reason") ?? "");
    const customerNote = String(formData.get("customerNote") ?? "");
    const response = await createRefundRequest(id, { reason, customerNote });
    if (response && typeof response === "object" && "success" in response && (response as any).success === false) {
      throw new Error(String((response as any).message ?? "Refund request failed"));
    }
  }

  return <div className="space-y-6">
    <Link href="/account/orders" className="text-sm font-medium text-stone-500 hover:text-stone-900">← Back to orders</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-stone-500">Order details</p><h1 className="mt-1 text-3xl font-semibold">{order.orderNumber ?? order.id}</h1><p className="mt-2 text-sm text-stone-500">Placed {date(order.createdAt)}</p></div><span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold">{String(order.status ?? "UNKNOWN").replaceAll("_"," ")}</span></header>

    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Items</h2><div className="mt-4 divide-y divide-stone-100">{(order.items ?? []).map((item: Row) => <div key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">{item.imageUrl ? <img src={item.imageUrl} alt={item.productName ?? "Product"} className="h-16 w-16 rounded-xl bg-stone-100 object-cover"/> : <div className="h-16 w-16 rounded-xl bg-stone-100"/>}<div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.productName}</p><p className="mt-1 text-xs text-stone-500">Qty {item.quantity}{item.variantSnapshot?.sizeLabel ? ` · ${item.variantSnapshot.sizeLabel}` : ""}</p></div><p className="text-sm font-semibold">{money(item.lineTotal, order.currency ?? "USD")}</p></div>)}</div><div className="mt-4 border-t pt-4 text-right"><p className="text-sm text-stone-500">Order total</p><p className="mt-1 text-xl font-semibold">{money(order.totalAmount, order.currency ?? "USD")}</p></div></section>

    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Payment</h2><p className="mt-2 text-sm text-stone-600">Payment status: <b>{order.paymentStatus}</b></p>{paymentAttempts.length ? <div className="mt-3 divide-y">{paymentAttempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{attempt.status} · {date(attempt.paidAt)}</span><b>{money(attempt.amount, attempt.currency ?? order.currency ?? "USD")}</b></div>)}</div> : <p className="mt-3 text-sm text-stone-500">No payment attempt details are available for this order.</p>}</section>

    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Apliiq fulfillment & tracking</h2>{fulfillment ? <div className="mt-3 space-y-3 text-sm"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-stone-100 px-3 py-1 font-medium">Submission: {fulfillment.submissionStatus}</span><span className="rounded-full bg-stone-100 px-3 py-1 font-medium">Provider: {fulfillment.providerStatus ?? "Pending update"}</span></div>{fulfillment.trackingCompany && <p className="text-stone-600">Carrier: {fulfillment.trackingCompany}</p>}{(fulfillment.trackingNumbers ?? []).map((tracking: string, index: number) => <div key={tracking} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 p-3"><span className="font-mono text-xs">{tracking}</span>{fulfillment.trackingUrls?.[index] && <a href={fulfillment.trackingUrls[index]} target="_blank" rel="noreferrer" className="font-semibold underline">Track shipment ↗</a>}</div>)}<p className="text-xs text-stone-400">Last updated {date(fulfillment.updatedAt)}</p></div> : <p className="mt-2 text-sm text-stone-500">Fulfillment has not been submitted to Apliiq yet.</p>}</section>

    {canRequestRefund ? <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Request a refund</h2><p className="mt-1 text-sm leading-6 text-stone-500">A normal refund request is available before Apliiq accepts the order. Your request will be reviewed by the store team.</p><form action={submitRefund} className="mt-4 grid gap-3"><label className="grid gap-1 text-sm font-medium">Reason<select name="reason" required className="rounded-lg border border-stone-300 px-3 py-2 font-normal"><option value="">Choose a reason</option><option value="Changed my mind">Changed my mind</option><option value="Ordered by mistake">Ordered by mistake</option><option value="Incorrect order details">Incorrect order details</option><option value="Other">Other</option></select></label><label className="grid gap-1 text-sm font-medium">Additional note *<textarea name="customerNote" rows={3} minLength={10} maxLength={1000} required className="rounded-lg border border-stone-300 px-3 py-2 font-normal" placeholder="Please explain your request (at least 10 characters)"/></label><button className="w-fit rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">Submit refund request</button></form></section> :
      order.paymentStatus === "PAID" && !["REFUNDED","CANCELLED"].includes(order.status) ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">Standard refund unavailable</h2><p className="mt-2 text-sm leading-6 text-amber-800">Apliiq has accepted or may have accepted this order. Standard customer refund requests are disabled; contact support for an exceptional review.</p></section> : null}
  </div>;
}
