import Link from "next/link";
import { getMyCustomerProfile } from "@/service/customer.service";
import { getMyOrders } from "@/service/order.service";
import { getMyRefundRequests } from "@/service/refund.service";

type Row = Record<string, any>;
const money = (value: unknown, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value ?? 0));
const date = (value: string) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
const isError = (value: any) => value && typeof value === "object" && value.success === false;

export default async function CustomerAccountPage() {
  const [profileResult, ordersResult, refundsResult] = await Promise.all([getMyCustomerProfile(), getMyOrders({ page: 1, limit: 5 }), getMyRefundRequests()]);
  const profile = !isError(profileResult) ? ((profileResult as any)?.data ?? profileResult) as Row : null;
  const orders = !isError(ordersResult) && Array.isArray((ordersResult as any)?.items) ? (ordersResult as any).items as Row[] : [];
  const refunds = !isError(refundsResult) && Array.isArray(refundsResult) ? refundsResult as Row[] : [];
  const orderError = isError(ordersResult) ? (ordersResult as any).message : null;
  const paidCount = orders.filter((order) => order.paymentStatus === "PAID").length;
  const latest = orders.slice(0, 4);

  return <div className="space-y-7">
    <header className="rounded-2xl bg-stone-900 px-6 py-7 text-white sm:px-8">
      <p className="text-sm text-stone-300">Customer account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}.</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">Your orders, payments and delivery updates — all in one place.</p>
      <Link href="/account/orders" className="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 hover:bg-stone-100">View my orders</Link>
    </header>

    <section className="grid gap-4 sm:grid-cols-3">
      {[["Recent orders", String(orders.length), "Latest five orders"], ["Paid orders", String(paidCount), "Among recent orders"], ["Refund requests", String(refunds.length), "All submitted requests"]].map(([label,value,help]) =>
        <article key={label} className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-stone-400">{help}</p>
        </article>)}
    </section>

    <section className="rounded-2xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div><h2 className="font-semibold">Recent orders</h2><p className="mt-1 text-xs text-stone-500">Your latest purchases and fulfillment progress</p></div>
        <Link href="/account/orders" className="text-sm font-semibold text-stone-700 hover:text-black">View all</Link>
      </div>
      {orderError ? <p role="alert" className="p-5 text-sm text-rose-700">Could not load orders: {orderError}</p> :
        latest.length ? <div className="divide-y divide-stone-100">{latest.map((order) => <Link key={order.id} href={`/account/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-stone-50">
          <div><p className="text-sm font-semibold">{order.orderNumber ?? order.id}</p><p className="mt-1 text-xs text-stone-500">{date(order.createdAt)} · {order.items?.length ?? 0} item(s)</p></div>
          <div className="text-right"><p className="text-sm font-semibold">{money(order.totalAmount, order.currency ?? "USD")}</p><p className="mt-1 text-xs text-stone-500">{order.status?.replaceAll("_"," ")}</p></div>
        </Link>)}</div> : <div className="px-5 py-12 text-center"><p className="font-medium">No orders yet</p><p className="mt-1 text-sm text-stone-500">Your purchases will appear here.</p><Link href="/products" className="mt-4 inline-flex text-sm font-semibold underline">Browse products</Link></div>}
    </section>

    <section className="grid gap-4 sm:grid-cols-2">
      <Link href="/account/payments" className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-400"><h2 className="font-semibold">Payment history</h2><p className="mt-2 text-sm leading-6 text-stone-500">Review payment attempts and confirmed payment status attached to each order.</p><span className="mt-4 inline-block text-sm font-semibold">View payments →</span></Link>
      <Link href="/account/refunds" className="rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-400"><h2 className="font-semibold">Refund requests</h2><p className="mt-2 text-sm leading-6 text-stone-500">Track submitted refund requests and see their latest status.</p><span className="mt-4 inline-block text-sm font-semibold">View refunds →</span></Link>
    </section>
  </div>;
}
