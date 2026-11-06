import Link from "next/link";
import { ArrowRight, ClipboardList, Package, Percent, Star } from "lucide-react";
import { getAdminOrders } from "@/service/order.service";
import { getAdminProducts } from "@/service/product.service";
import { getCoupons } from "@/service/coupon.service";
import { getAdminReviews } from "@/service/review.service";
import { AdminResourcePage, getAdminTotal } from "@/components/admin/admin-resource-page";

function Metric({ title, value, icon: Icon, href }: { title: string; value: string; icon: typeof Package; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19}/></span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-slate-900">Open section <ArrowRight size={13}/></span>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [ordersResult, productsResult, couponsResult, reviewsResult] = await Promise.all([
    getAdminOrders({ page: 1, limit: 8 }),
    getAdminProducts({ page: 1, limit: 1 }),
    getCoupons(),
    getAdminReviews("PENDING"),
  ]);
  const coupons = getAdminRows(couponsResult);
  const reviews = getAdminRows(reviewsResult);
  const orderTotal = getAdminTotal(ordersResult);
  const productTotal = getAdminTotal(productsResult);
  const pendingCoupons = coupons.filter((coupon) => coupon.isActive === true).length;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Store workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard overview</h1>
          <p className="mt-2 text-sm text-slate-500">Live summaries loaded from your NestJS services.</p>
        </div>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700">Manage orders <ArrowRight size={15}/></Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Metric title="Total orders" value={orderTotal === null ? "—" : orderTotal.toLocaleString("en-US")} icon={ClipboardList} href="/admin/orders"/>
        <Metric title="Catalog products" value={productTotal === null ? "—" : productTotal.toLocaleString("en-US")} icon={Package} href="/admin/products"/>
        <Metric title="Active coupons in response" value={String(pendingCoupons)} icon={Percent} href="/admin/coupons"/>
        <Metric title="Pending reviews" value={String(reviews.length)} icon={Star} href="/admin/reviews"/>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-950">Recent orders</h2><p className="mt-1 text-sm text-slate-500">Latest orders returned by the admin orders API.</p></div>
          <Link href="/admin/orders" className="text-sm font-semibold text-slate-700 hover:text-slate-950">View all</Link>
        </div>
        <AdminResourcePage title="" description="" result={ordersResult} columns={[
          { label: "Order", key: "orderNumber" },
          { label: "Customer", key: "customerName" },
          { label: "Email", key: "customerEmail" },
          { label: "Payment", key: "paymentStatus" },
          { label: "Status", key: "status" },
          { label: "Total (USD)", key: "totalAmount" },
        ]} emptyMessage="No orders have been returned by the API yet."/>
      </section>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Revenue analytics are not shown yet because the backend does not currently expose a dedicated analytics/reporting endpoint. No sample revenue or fabricated chart data is displayed.
      </div>
    </div>
  );
}
