import { ArrowDownRight, ArrowUpRight, CreditCard, Ellipsis, Package, ShoppingCart, Users } from "lucide-react";

const metrics = [
  { label: "Total revenue", value: "$24,780.00", change: "+12.8%", positive: true, icon: CreditCard, tone: "bg-violet-50 text-violet-700" },
  { label: "Total orders", value: "1,284", change: "+8.2%", positive: true, icon: ShoppingCart, tone: "bg-blue-50 text-blue-700" },
  { label: "Products", value: "356", change: "+4.6%", positive: true, icon: Package, tone: "bg-amber-50 text-amber-700" },
  { label: "Customers", value: "8,549", change: "-1.4%", positive: false, icon: Users, tone: "bg-emerald-50 text-emerald-700" },
];
const orders = [
  { id: "#ORD-1048", customer: "Olivia Martin", email: "olivia@example.com", date: "Oct 18, 2026", amount: "$249.00", status: "Paid" },
  { id: "#ORD-1047", customer: "Jackson Lee", email: "jackson@example.com", date: "Oct 18, 2026", amount: "$129.00", status: "Processing" },
  { id: "#ORD-1046", customer: "Isabella Nguyen", email: "isabella@example.com", date: "Oct 17, 2026", amount: "$389.00", status: "Shipped" },
  { id: "#ORD-1045", customer: "William Kim", email: "william@example.com", date: "Oct 17, 2026", amount: "$79.00", status: "Pending" },
  { id: "#ORD-1044", customer: "Sofia Davis", email: "sofia@example.com", date: "Oct 16, 2026", amount: "$199.00", status: "Paid" },
];
const bars = [34, 48, 39, 62, 47, 73, 55, 66, 44, 81, 59, 92];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="mb-2 text-sm font-medium text-slate-500">Sunday, October 18, 2026</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard overview</h1><p className="mt-2 text-sm text-slate-500">Here’s what’s happening with your store today.</p></div>
        <div className="flex gap-2"><button className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">Last 30 days</button><button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-700">+ Add product</button></div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => { const Icon = metric.icon; const Trend = metric.positive ? ArrowUpRight : ArrowDownRight; return (
          <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
            <div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${metric.tone}`}><Icon size={20}/></span><button aria-label={`More options for ${metric.label}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><Ellipsis size={19}/></button></div>
            <p className="mt-5 text-sm font-medium text-slate-500">{metric.label}</p><div className="mt-1 flex flex-wrap items-baseline gap-2"><span className="text-2xl font-bold tracking-tight text-slate-900">{metric.value}</span><span className={`inline-flex items-center text-xs font-semibold ${metric.positive ? "text-emerald-600" : "text-rose-600"}`}><Trend size={14}/>{metric.change}</span></div><p className="mt-2 text-xs text-slate-400">Compared with previous period</p>
          </article>
        )})}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">Revenue overview</h2><p className="mt-1 text-sm text-slate-500">Monthly performance at a glance</p></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">+12.8% this month</span></div>
          <div className="mt-7 flex h-52 items-end gap-2 sm:gap-3">{bars.map((height, i) => <div key={i} className="group flex h-full flex-1 flex-col justify-end"><div title={`Sample revenue: ${height}%`} style={{ height: `${height}%` }} className={`w-full rounded-t-md transition-colors ${i === 11 ? "bg-slate-900" : "bg-slate-100 group-hover:bg-slate-300"}`}/></div>)}</div>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-400"><span>Oct 1</span><span>Oct 5</span><span>Oct 10</span><span>Oct 15</span><span>Oct 18</span></div>
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">Preview data only — connect the analytics API before using these figures for business decisions.</p>
        </article>
        <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
          <div className="flex items-start justify-between"><div><h2 className="font-bold">Order status</h2><p className="mt-1 text-sm text-slate-500">Current order breakdown</p></div><button aria-label="Order status options" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><Ellipsis size={19}/></button></div>
          <div className="mt-6 space-y-5">{[{label:"Delivered",value:68,color:"bg-emerald-500",count:"872"},{label:"Processing",value:21,color:"bg-blue-500",count:"269"},{label:"Pending",value:8,color:"bg-amber-500",count:"103"},{label:"Cancelled",value:3,color:"bg-rose-500",count:"40"}].map((item) => <div key={item.label}><div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">{item.label}</span><span className="font-semibold text-slate-900">{item.count} <span className="font-normal text-slate-400">({item.value}%)</span></span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{width:`${item.value}%`}}/></div></div>)}</div>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6"><div><h2 className="font-bold">Recent orders</h2><p className="mt-1 text-sm text-slate-500">A quick look at your latest transactions</p></div><button className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View all orders</button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-y border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3.5 font-semibold">Order</th><th className="px-6 py-3.5 font-semibold">Customer</th><th className="px-6 py-3.5 font-semibold">Date</th><th className="px-6 py-3.5 font-semibold">Amount</th><th className="px-6 py-3.5 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.map((order) => <tr key={order.id} className="transition hover:bg-slate-50/70"><td className="px-6 py-4 font-semibold text-slate-900">{order.id}</td><td className="px-6 py-4"><p className="font-medium text-slate-800">{order.customer}</p><p className="mt-0.5 text-xs text-slate-400">{order.email}</p></td><td className="px-6 py-4 text-slate-500">{order.date}</td><td className="px-6 py-4 font-semibold">{order.amount}</td><td className="px-6 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${order.status === "Paid" ? "bg-emerald-50 text-emerald-700" : order.status === "Shipped" ? "bg-violet-50 text-violet-700" : order.status === "Processing" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{order.status}</span></td></tr>)}</tbody></table></div>
        <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-400">Demo orders shown for layout preview. Live order data is not connected yet.</div>
      </section>
    </div>
  );
}
