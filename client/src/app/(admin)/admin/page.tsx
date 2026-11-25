import Link from "next/link";
import { ArrowRight, ClipboardList, CreditCard, Package, Percent, Star } from "lucide-react";
import { getAdminOrders } from "@/service/order.service";
import { getAdminProducts } from "@/service/product.service";
import { getCoupons } from "@/service/coupon.service";
import { getAdminReviews } from "@/service/review.service";
import { getAnalyticsOverview } from "@/service/analytics.service";
import { AdminResourcePage, getAdminRows, getAdminTotal } from "@/components/admin/admin-resource-page";

function Metric({ title, value, icon: Icon, href }: { title: string; value: string; icon: typeof Package; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-indigo-100/80 bg-white/80 p-5 shadow-lg shadow-indigo-100/40 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><Icon size={19}/></span>
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-800">Open section <ArrowRight size={13}/></span>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [ordersResult, productsResult, couponsResult, reviewsResult, analyticsResult] = await Promise.all([
    getAdminOrders({ page: 1, limit: 8 }),
    getAdminProducts({ page: 1, limit: 1 }),
    getCoupons(),
    getAdminReviews("PENDING"),
    getAnalyticsOverview(),
  ]);
  const coupons = getAdminRows(couponsResult);
  const reviews = getAdminRows(reviewsResult);
  const orderTotal = getAdminTotal(ordersResult);
  const productTotal = getAdminTotal(productsResult);
  const pendingCoupons = coupons.filter((coupon) => coupon.isActive === true).length;
  const analytics = analyticsResult && typeof analyticsResult === "object" && !("success" in analyticsResult && (analyticsResult as { success?: boolean }).success === false) ? analyticsResult as { sales?: { grossRevenue?: number; paidOrders?: number } } : null;
  const grossRevenue = analytics?.sales?.grossRevenue;

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">Store workspace</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Dashboard overview</h1>
          <p className="mt-2 text-sm text-slate-500">Live summaries loaded from your NestJS services.</p>
        </div>
        <Link href="/admin/orders" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700">Manage orders <ArrowRight size={15}/></Link>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        <Metric title="Total orders" value={orderTotal === null ? "—" : orderTotal.toLocaleString("en-US")} icon={ClipboardList} href="/admin/orders"/>
        <Metric title="Catalog products" value={productTotal === null ? "—" : productTotal.toLocaleString("en-US")} icon={Package} href="/admin/products"/>
        <Metric title="Gross revenue (30 days)" value={grossRevenue === undefined ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(grossRevenue)} icon={CreditCard} href="/admin/analytics"/>
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
          { label: "Customer", key: "user.name" },
          { label: "Email", key: "user.email" },
          { label: "Payment", key: "paymentStatus" },
          { label: "Status", key: "status" },
          { label: "Total (USD)", key: "totalAmount" },
        ]} emptyMessage="No orders have been returned by the API yet."/>
      </section>

      {!analytics && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Live revenue summary is temporarily unavailable. Open Analytics to review the API response and reporting details.</div>}
    </div>
  );
}
