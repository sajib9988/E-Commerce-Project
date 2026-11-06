"use client";

import { useState } from "react";
import { RefreshCw, Ban } from "lucide-react";
import { reconcileApliiqOrder, requestApliiqCancellation } from "@/service/admin.service";

type ApliiqOrder = {
  id: string;
  orderNumber?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  fulfillments?: Array<{
    id: string;
    submissionStatus?: string | null;
    providerStatus?: string | null;
    externalOrderId?: string | null;
    trackingNumbers?: string[] | null;
    shippedAt?: string | null;
  }>;
};

export function ApliiqOrdersTable({ orders }: { orders: ApliiqOrder[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function run(orderId: string, action: "reconcile" | "cancel") {
    setPendingId(orderId);
    setIsPending(true);
    setMessage(null);
    try {
      const result = action === "reconcile"
        ? await reconcileApliiqOrder(orderId)
        : await requestApliiqCancellation(orderId);
      const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;
      const detail = typeof result === "object" && result !== null && "message" in result
        ? String(result.message)
        : action === "reconcile" ? "Apliiq order reconciliation completed." : "Cancellation request submitted. Check the provider result before refunding or restocking.";
      setMessage(failed ? `Request failed: ${detail}` : detail);
    } catch {
      setMessage("The request could not be completed. Please try again.");
    } finally {
      setPendingId(null);
      setIsPending(false);
    }
  }

  if (orders.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No orders with Apliiq fulfillment records were returned.</div>;
  }

  return (
    <div className="space-y-4">
      {message && <p role="status" className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Order status</th><th className="px-5 py-3">Apliiq submission</th><th className="px-5 py-3">Provider status</th><th className="px-5 py-3">Tracking</th><th className="px-5 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const fulfillment = order.fulfillments?.[0];
              const busy = pendingId === order.id;
              return (
                <tr key={order.id}>
                  <td className="px-5 py-4 font-semibold text-slate-900">{order.orderNumber ?? order.id}</td>
                  <td className="px-5 py-4 text-slate-600">{order.status ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{fulfillment?.submissionStatus ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{fulfillment?.providerStatus ?? "Unknown"}</td>
                  <td className="px-5 py-4 text-slate-600">{fulfillment?.trackingNumbers?.join(", ") || "Not shipped"}</td>
                  <td className="px-5 py-4"><div className="flex gap-2">
                    <button type="button" disabled={busy || isPending} onClick={() => run(order.id, "reconcile")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={13}/> Reconcile</button>
                    <button type="button" disabled={busy || isPending} onClick={() => run(order.id, "cancel")} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Ban size={13}/> Request cancel</button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-5 text-slate-500">Cancellation is not guaranteed by this request. The current Apliiq API does not document an automatic cancel endpoint; an admin may need to cancel in the Apliiq Dashboard and then reconcile. Never restock solely because a cancellation was requested.</p>
    </div>
  );
}
