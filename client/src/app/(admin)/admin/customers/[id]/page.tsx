import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ShoppingBag, DollarSign, CalendarDays, Package, Truck } from "lucide-react";
import { getAdminCustomerById } from "@/service/admin.service";

type Customer = { id: string; name: string; email: string; emailVerified: boolean; createdAt: string; updatedAt: string };
type CustomerOrderItem = {
  id: string; productName: string; sku?: string | null; quantity: number;
  unitPrice: string | number; lineTotal: string | number;
};
type CustomerPaymentAttempt = {
  id: string; status: string; amount: string | number; currency: string; paidAt?: string | null;
};
type CustomerFulfillment = {
  id: string; provider: string; submissionStatus: string; providerStatus?: string | null;
  trackingCompany?: string | null; trackingNumbers: string[]; trackingUrls: string[]; shippedAt?: string | null;
};
type CustomerOrder = {
  id: string; orderNumber: string; totalAmount: string | number; currency: string;
  paymentStatus: string; status: string; createdAt: string;
  items: CustomerOrderItem[]; paymentAttempts: CustomerPaymentAttempt[]; fulfillments: CustomerFulfillment[];
};
type CustomerDetails = {
  customer: Customer;
  stats: { orderCount: number; paidSpend: string | number; paidOrderCount: number };
  orders: CustomerOrder[];
};
type PageProps = { params: Promise<{ id: string }> };
function isError(value: unknown): value is { success: false; statusCode?: number; message: string } {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
function money(value: string | number, currency = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(Number(value));
}
function date(value: string) { return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }); }
function safeTrackingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch { return null; }
}

export default async function AdminCustomerDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getAdminCustomerById(id);
  if (isError(result)) {
    if (result.statusCode === 404) notFound();
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.message}</div>;
  }
  const payload = (result as { data?: CustomerDetails }).data;
  if (!payload?.customer) notFound();
  const { customer, stats, orders } = payload;

  return <div className="space-y-6">
    <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-950"><ArrowLeft className="size-4" /> Back to customers</Link>
    <header>
      <p className="text-sm font-medium text-slate-500">Customer profile</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{customer.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Mail className="size-4" /> {customer.email}</p>
      <p className="mt-2 text-xs text-slate-500">{customer.emailVerified ? "Email verified" : "Email not verified"} · Joined {new Date(customer.createdAt).toLocaleDateString("en-US")}</p>
    </header>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border bg-white p-5"><ShoppingBag className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Total orders</p><p className="mt-1 text-2xl font-bold">{stats.orderCount}</p></div>
      <div className="rounded-2xl border bg-white p-5"><DollarSign className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Paid lifetime spend</p><p className="mt-1 text-2xl font-bold">{money(stats.paidSpend)}</p></div>
      <div className="rounded-2xl border bg-white p-5"><ShoppingBag className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Paid orders</p><p className="mt-1 text-2xl font-bold">{stats.paidOrderCount}</p></div>
      <div className="rounded-2xl border bg-white p-5"><CalendarDays className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Customer since</p><p className="mt-1 text-lg font-bold">{new Date(customer.createdAt).toLocaleDateString("en-US")}</p></div>
    </div>

    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4"><h2 className="font-semibold">Order history</h2><p className="text-xs text-slate-500">Latest 50 orders · newest first</p></div>
      {orders.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">This customer has not placed an order yet.</p> : <div className="divide-y divide-slate-100">
        {orders.map((order) => (
          <details key={order.id} className="group px-5 py-4">
            <summary className="grid cursor-pointer list-none items-center gap-3 md:grid-cols-[1.2fr_0.6fr_0.8fr_0.8fr_0.8fr]">
              <span><span className="block font-mono text-xs font-semibold">{order.orderNumber}</span><span className="mt-1 block text-xs text-slate-500">{date(order.createdAt)}</span></span>
              <span className="text-sm">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span>
              <span className="text-sm font-semibold">{money(order.totalAmount, order.currency)}</span>
              <span className="text-xs text-slate-600">Payment: {order.paymentStatus}</span>
              <span className="text-xs text-slate-600">Order: {order.status}</span>
            </summary>
            <div className="mt-4 grid gap-5 border-t border-slate-100 pt-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Package className="size-4" /> Purchased items</h3>
                {order.items.length === 0 ? <p className="text-sm text-slate-500">No item details.</p> : <div className="space-y-2">
                  {order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="min-w-0"><p className="font-medium">{item.productName}</p><p className="text-xs text-slate-500">{item.sku || "No SKU"} · Qty {item.quantity} · {money(item.unitPrice, order.currency)} each</p></div>
                    <span className="shrink-0 font-semibold">{money(item.lineTotal, order.currency)}</span>
                  </div>)}
                </div>}
                <h3 className="mb-2 mt-5 text-sm font-semibold">Payment attempts</h3>
                {order.paymentAttempts.length === 0 ? <p className="text-sm text-slate-500">No payment attempt records.</p> : <ul className="space-y-2 text-xs text-slate-600">
                  {order.paymentAttempts.map((attempt) => <li key={attempt.id} className="flex justify-between gap-3"><span>{attempt.status}{attempt.paidAt ? ` · Paid ${date(attempt.paidAt)}` : ""}</span><span>{money(attempt.amount, attempt.currency)}</span></li>)}
                </ul>}
              </div>
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Truck className="size-4" /> Fulfillment & tracking</h3>
                {order.fulfillments.length === 0 ? <p className="text-sm text-slate-500">No fulfillment record yet.</p> : <div className="space-y-3">
                  {order.fulfillments.map((fulfillment) => <div key={fulfillment.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium">{fulfillment.provider} · {fulfillment.submissionStatus}</p>
                    {fulfillment.providerStatus && <p className="mt-1 text-xs text-slate-500">Provider status: {fulfillment.providerStatus}</p>}
                    {fulfillment.trackingCompany && <p className="mt-1 text-xs text-slate-500">Carrier: {fulfillment.trackingCompany}</p>}
                    {fulfillment.shippedAt && <p className="mt-1 text-xs text-slate-500">Shipped: {date(fulfillment.shippedAt)}</p>}
                    {fulfillment.trackingNumbers.map((number, index) => <p key={number} className="mt-2 text-xs">Tracking: {number}{fulfillment.trackingUrls[index] && safeTrackingUrl(fulfillment.trackingUrls[index]) && <> · <a href={safeTrackingUrl(fulfillment.trackingUrls[index])!} target="_blank" rel="noreferrer" className="font-medium underline">Track shipment</a></>}</p>)}
                  </div>)}
                </div>}
              </div>
            </div>
          </details>
        ))}
      </div>}
    </section>
  </div>;
}
