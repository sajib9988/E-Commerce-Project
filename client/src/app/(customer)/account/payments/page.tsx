import Link from "next/link";
import { getMyOrders } from "@/service/order.service";

type Row = Record<string, any>;
const money = (v: unknown, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
const date = (v?: string | null) => v ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "—";

export default async function CustomerPaymentsPage() {
  const result = await getMyOrders({ page: 1, limit: 50 });
  const failed = !!result && typeof result === "object" && "success" in result && (result as any).success === false;
  const orders: Row[] = !failed && Array.isArray((result as any)?.items) ? (result as any).items : [];
  const payments = orders.flatMap((order) => (order.paymentAttempts ?? []).map((payment: Row) => ({ ...payment, order })));
  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">Billing</p><h1 className="mt-1 text-3xl font-semibold">Payment history</h1><p className="mt-2 text-sm text-stone-500">Payment attempt details returned with your own orders. Card numbers and payment secrets are never shown.</p></header>
    {failed ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{String((result as any).message ?? "Unable to load payment history")}</p> :
      payments.length ? <div className="overflow-hidden rounded-2xl border bg-white"><div className="divide-y">{payments.map((payment: Row) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-5"><div><Link href={`/account/orders/${payment.order.id}`} className="font-semibold underline">{payment.order.orderNumber ?? payment.order.id}</Link><p className="mt-1 text-xs text-stone-500">{date(payment.paidAt ?? payment.order.createdAt)} · {payment.currency?.toUpperCase()}</p></div><div className="text-right"><p className="font-semibold">{money(payment.amount, payment.currency ?? "USD")}</p><p className="mt-1 text-xs text-stone-500">{payment.status}</p></div></div>)}</div></div> :
      <div className="rounded-2xl border border-dashed bg-white p-12 text-center"><h2 className="font-semibold">No payment attempts yet</h2><p className="mt-2 text-sm text-stone-500">Payments will appear after checkout.</p></div>}
  </div>;
}
