import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, ShoppingBag, DollarSign, CalendarDays } from "lucide-react";
import { getAdminCustomerById } from "@/service/admin.service";

type Customer = { id: string; name: string; email: string; emailVerified: boolean; createdAt: string; updatedAt: string };
type CustomerOrderItem = { quantity: number };
type CustomerOrder = {
  id: string; orderNumber: string; totalAmount: string | number; currency: string;
  paymentStatus: string; status: string; createdAt: string; items: CustomerOrderItem[];
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
    <header><p className="text-sm font-medium text-slate-500">Customer profile</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{customer.name}</h1><p className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Mail className="size-4" /> {customer.email}</p><p className="mt-2 text-xs text-slate-500">{customer.emailVerified ? "Email verified" : "Email not verified"} · Joined {new Date(customer.createdAt).toLocaleDateString("en-US")}</p></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border bg-white p-5"><ShoppingBag className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Total orders</p><p className="mt-1 text-2xl font-bold">{stats.orderCount}</p></div>
      <div className="rounded-2xl border bg-white p-5"><DollarSign className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Paid lifetime spend</p><p className="mt-1 text-2xl font-bold">{money(stats.paidSpend)}</p></div>
      <div className="rounded-2xl border bg-white p-5"><ShoppingBag className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Paid orders</p><p className="mt-1 text-2xl font-bold">{stats.paidOrderCount}</p></div>
      <div className="rounded-2xl border bg-white p-5"><CalendarDays className="size-5 text-slate-400" /><p className="mt-3 text-sm text-slate-500">Customer since</p><p className="mt-1 text-lg font-bold">{new Date(customer.createdAt).toLocaleDateString("en-US")}</p></div>
    </div>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b px-5 py-4"><h2 className="font-semibold">Order history</h2><p className="text-xs text-slate-500">Latest 50 orders · newest first</p></div>
      {orders.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">This customer has not placed an order yet.</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Items</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Order status</th><th className="px-5 py-3">Placed</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.id}>
            <td className="px-5 py-4 font-mono text-xs">{order.orderNumber}</td><td className="px-5 py-4">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
            <td className="px-5 py-4 font-medium">{money(order.totalAmount, order.currency)}</td><td className="px-5 py-4">{order.paymentStatus}</td><td className="px-5 py-4">{order.status}</td><td className="px-5 py-4 text-slate-500">{date(order.createdAt)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
