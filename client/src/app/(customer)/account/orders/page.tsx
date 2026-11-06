import Link from "next/link";
import { getMyOrders } from "@/service/order.service";

type Row = Record<string, any>;
const money = (v: unknown, c = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(Number(v ?? 0));
const date = (v: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(v));
const statusClass = (status: string) => status === "PAID" || status === "DELIVERED" ? "bg-emerald-50 text-emerald-700" : status === "CANCELLED" || status === "REFUNDED" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800";

export default async function CustomerOrdersPage() {
  const result = await getMyOrders({ page: 1, limit: 50 });
  const failed = !!result && typeof result === "object" && "success" in result && (result as any).success === false;
  const orders: Row[] = !failed && Array.isArray((result as any)?.items) ? (result as any).items : [];
  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">Your purchases</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">My orders</h1><p className="mt-2 text-sm text-stone-500">Review order status, payment and Apliiq delivery tracking.</p></header>
    {failed ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{String((result as any).message ?? "Unable to load orders")}</div> :
    orders.length ? <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-4 border-b bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 md:grid"><span>Order</span><span>Date</span><span>Payment</span><span>Total</span><span>Details</span></div>
      <div className="divide-y divide-stone-100">{orders.map((order) => <article key={order.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto] md:items-center md:gap-4">
        <div><p className="font-semibold">{order.orderNumber ?? order.id}</p><p className="mt-1 text-xs text-stone-500">{order.items?.length ?? 0} item(s)</p></div>
        <p className="text-sm text-stone-600">{date(order.createdAt)}</p>
        <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.paymentStatus)}`}>{order.paymentStatus?.replaceAll("_"," ") ?? "Unknown"}</span></div>
        <p className="text-sm font-semibold">{money(order.totalAmount, order.currency ?? "USD")}</p>
        <Link href={`/account/orders/${order.id}`} className="text-sm font-semibold underline underline-offset-4">View order</Link>
      </article>)}</div></div> :
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center"><h2 className="font-semibold">No orders found</h2><p className="mt-2 text-sm text-stone-500">When you place an order, it will show up here.</p><Link href="/products" className="mt-4 inline-flex rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white">Shop products</Link></div>}
  </div>;
}
