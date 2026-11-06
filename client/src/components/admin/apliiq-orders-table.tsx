"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Ban, ExternalLink } from "lucide-react";
import { reconcileApliiqOrder, requestApliiqCancellation } from "@/service/admin.service";

type ApliiqFulfillment = {
  id: string;
  provider?: string;
  submissionStatus?: string | null;
  providerStatus?: string | null;
  externalOrderId?: string | null;
  trackingCompany?: string | null;
  trackingNumbers?: string[] | null;
  trackingUrls?: string[] | null;
  submittedAt?: string | null;
  shippedAt?: string | null;
  lastErrorCode?: string | null;
};
type ApliiqOrder = {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
  user?: { name?: string | null; email?: string | null };
  fulfillments?: ApliiqFulfillment[];
};

function date(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function ApliiqOrdersTable({ orders }: { orders: ApliiqOrder[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(order: ApliiqOrder, action: "reconcile" | "cancel") {
    if (action === "cancel" && !window.confirm("Request Apliiq cancellation workflow for order " + (order.orderNumber ?? order.id) + "? This does not confirm provider cancellation or trigger a refund.")) return;
    setPendingId(order.id);
    setMessage(null);
    setError(null);
    try {
      const result = action === "reconcile"
        ? await reconcileApliiqOrder(order.id)
        : await requestApliiqCancellation(order.id);
      const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;
      const detail = typeof result === "object" && result !== null && "message" in result
        ? String(result.message)
        : action === "reconcile"
          ? "Reconciliation request completed. Refreshing provider status."
          : "Cancellation workflow requested. Confirm cancellation in Apliiq if required, then reconcile.";
      if (failed) setError(detail);
      else {
        setMessage(detail);
        router.refresh();
      }
    } catch {
      setError("The request could not be completed. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (orders.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No orders with Apliiq fulfillment records were returned.</div>;
  }

  return (
    <div className="space-y-4">
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Order / customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Submission</th><th className="px-4 py-3">Apliiq order</th><th className="px-4 py-3">Provider status</th><th className="px-4 py-3">Tracking</th><th className="px-4 py-3">Last update</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const fulfillment = order.fulfillments?.find((item) => item.provider === "APLIIQ") ?? order.fulfillments?.[0];
              const shipped = Boolean(fulfillment?.shippedAt) || (fulfillment?.providerStatus ?? "").toLowerCase().includes("ship");
              const busy = pendingId === order.id;
              return (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-4"><p className="font-semibold text-slate-900">{order.orderNumber ?? order.id}</p><p className="mt-1 text-xs text-slate-500">{order.user?.name || "Customer"} · {order.user?.email || "—"}</p><p className="mt-1 text-xs text-slate-400">{date(order.createdAt)}</p></td>
                  <td className="px-4 py-4"><p>{order.paymentStatus ?? "—"}</p><p className="mt-1 text-xs text-slate-500">{order.status ?? "—"}</p></td>
                  <td className="px-4 py-4"><p>{fulfillment?.submissionStatus ?? "—"}</p><p className="mt-1 text-xs text-slate-500">Submitted: {date(fulfillment?.submittedAt)}</p></td>
                  <td className="px-4 py-4"><p className="font-mono text-xs">{fulfillment?.externalOrderId ?? "Not assigned"}</p>{fulfillment?.lastErrorCode && <p className="mt-1 max-w-48 break-words text-xs text-rose-700">{fulfillment.lastErrorCode}</p>}</td>
                  <td className="px-4 py-4">{fulfillment?.providerStatus ?? "Unknown"}</td>
                  <td className="px-4 py-4"><p>{fulfillment?.trackingCompany ?? "Carrier pending"}</p>{fulfillment?.trackingNumbers?.length ? fulfillment.trackingNumbers.map((tracking, index) => <p key={tracking} className="mt-1 text-xs">{fulfillment.trackingUrls?.[index] ? <a href={fulfillment.trackingUrls[index]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline">{tracking}<ExternalLink size={11}/></a> : tracking}</p>) : <span className="text-xs text-slate-500">Not shipped</span>}</td>
                  <td className="px-4 py-4"><p>{date(fulfillment?.shippedAt)}</p><p className="mt-1 text-xs text-slate-500">Order: {date(order.createdAt)}</p></td>
                  <td className="px-4 py-4"><div className="flex flex-col gap-2">
                    <button type="button" disabled={busy} onClick={() => run(order, "reconcile")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={13}/> Reconcile</button>
                    {!shipped && <button type="button" disabled={busy} onClick={() => run(order, "cancel")} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Ban size={13}/> Request cancel</button>}
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-5 text-slate-500">Reconcile fetches provider state and tracking. The cancellation request does not cancel the provider order by itself; if the API requires dashboard action, complete it in Apliiq and reconcile again. Never issue a refund or restock based only on a cancellation request.</p>
    </div>
  );
}
