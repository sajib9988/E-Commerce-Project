"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Loader2, ArrowRight, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getAdminCustomers } from "@/service/admin.service";

type Customer = { id: string; name: string; email: string; emailVerified: boolean; createdAt: string; orderCount: number; paidSpend: string };
type ApiError = { success: false; message: string };
function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
function rowsFrom(value: unknown): Customer[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.data)) return record.data as Customer[];
  return [];
}
function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

export function AdminCustomersClient({ initialResult }: { initialResult: unknown }) {
  const [result, setResult] = useState(initialResult);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const error = isApiError(result) ? result.message : "";
  const customers = rowsFrom(result);
  async function runSearch(value: string) {
    setSearch(value);
    setLoading(true);
    try { setResult(await getAdminCustomers({ search: value.trim(), page: 1, limit: 50 })); }
    catch { setResult({ success: false, message: "Could not load customers." }); }
    finally { setLoading(false); }
  }

  return <div className="space-y-6">
    <header><p className="text-sm font-medium text-slate-500">Store management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Customers</h1><p className="mt-2 text-sm text-slate-600">Customer profiles, order activity and paid lifetime spend.</p></header>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => void runSearch(event.target.value)} placeholder="Search by customer name or email..." className="h-11 pl-9" /></div>
    </section>
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : loading ? <div className="flex items-center justify-center gap-2 rounded-2xl border bg-white p-10 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Searching customers...</div> : customers.length === 0 ? <div className="rounded-2xl border border-dashed bg-white p-10 text-center"><Users className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-medium">No customers found</p><p className="mt-1 text-sm text-slate-500">Try another name or email address.</p></div> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Email status</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Paid spend</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3"></th></tr></thead>
        <tbody className="divide-y divide-slate-100">{customers.map((customer) => <tr key={customer.id} className="hover:bg-slate-50/70">
          <td className="px-5 py-4"><span className="font-semibold">{customer.name}</span><span className="block text-xs text-slate-500">{customer.email}</span></td>
          <td className="px-5 py-4"><span className={customer.emailVerified ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"}>{customer.emailVerified ? "Verified" : "Unverified"}</span></td>
          <td className="px-5 py-4 tabular-nums">{customer.orderCount}</td><td className="px-5 py-4 tabular-nums">{money(customer.paidSpend)}</td>
          <td className="px-5 py-4 text-slate-500">{new Date(customer.createdAt).toLocaleDateString("en-US")}</td><td className="px-5 py-4 text-right"><Link href={`/admin/customers/${customer.id}`} className="inline-flex items-center gap-1 font-medium text-slate-900 hover:underline">Details <ArrowRight className="size-4" /></Link></td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>;
}
