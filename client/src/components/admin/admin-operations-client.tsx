"use client";

import { useMemo, useState, useTransition } from "react";
import { updateOrderStatus } from "@/service/order.service";
import { resolvePaymentManualReview } from "@/service/payment.service";
import { approveRefundRequest, rejectRefundRequest } from "@/service/refund.service";

type Row = Record<string, unknown>;
type Props = { orders: unknown; payments: unknown; refunds: unknown };

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((x): x is Row => typeof x === "object" && x !== null);
  if (typeof value !== "object" || value === null) return [];
  const v = value as Row;
  if (Array.isArray(v.items)) return v.items.filter((x): x is Row => typeof x === "object" && x !== null);
  if (Array.isArray(v.data)) return v.data.filter((x): x is Row => typeof x === "object" && x !== null);
  return [];
}
function str(value: unknown): string { return value === null || value === undefined || value === "" ? "—" : String(value); }
function money(value: unknown, currency = "USD"): string {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n) : "—";
}
function date(value: unknown): string {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
function nested(row: Row, key: string): Row {
  const value = row[key];
  return typeof value === "object" && value !== null ? value as Row : {};
}
function ErrorBox({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>;
}

export function AdminOperationsClient({ orders: orderData, payments: paymentData, refunds: refundData }: Props) {
  const [orderRows, setOrderRows] = useState(() => rows(orderData));
  const [paymentRows, setPaymentRows] = useState(() => rows(paymentData));
  const [refundRows, setRefundRows] = useState(() => rows(refundData));
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => ({
    orders: orderRows.length,
    manualReviews: paymentRows.length,
    pendingRefunds: refundRows.filter((r) => r.status === "PENDING").length,
  }), [orderRows, paymentRows, refundRows]);

  function note(id: string) { return notes[id] ?? ""; }
  function setError(id: string, message: string) { setErrors((old) => ({ ...old, [id]: message })); }
  function clearMessage(id: string) { setErrors((old) => ({ ...old, [id]: "" })); setSuccess(""); }

  function changeOrderStatus(order: Row, status: string) {
    const id = str(order.id);
    clearMessage(id);
    startTransition(async () => {
      const result = await updateOrderStatus(id, status);
      if (typeof result === "object" && result !== null && "success" in result && (result as Row).success === false) {
        setError(id, str((result as Row).message));
        return;
      }
      setOrderRows((old) => old.map((r) => r.id === order.id ? { ...r, status } : r));
      setSuccess(`Order ${str(order.orderNumber)} updated to ${status}.`);
    });
  }

  function resolvePayment(row: Row, decision: "REFUND" | "RESOLVE_NO_REFUND") {
    const id = str(row.id);
    const text = note(id).trim();
    if (text.length < 5) { setError(id, "Please enter a resolution note (at least 5 characters)."); return; }
    clearMessage(id);
    startTransition(async () => {
      const result = await resolvePaymentManualReview(id, { decision, note: text });
      if (typeof result === "object" && result !== null && "success" in result && (result as Row).success === false) {
        setError(id, str((result as Row).message)); return;
      }
      if (decision === "RESOLVE_NO_REFUND") {
        setPaymentRows((old) => old.filter((r) => r.id !== row.id));
        setSuccess("Manual review resolved. No refund was requested.");
      } else {
        setSuccess("Refund request sent to Stripe. The payment/order status will change only after Stripe webhook confirmation.");
      }
    });
  }

  function resolveRefund(row: Row, decision: "approve" | "reject") {
    const id = str(row.id);
    const text = note(id).trim();
    if (decision === "reject" && text.length < 3) { setError(id, "A rejection reason of at least 3 characters is required."); return; }
    clearMessage(id);
    startTransition(async () => {
      const result = decision === "approve"
        ? await approveRefundRequest(id, text || undefined)
        : await rejectRefundRequest(id, text);
      if (typeof result === "object" && result !== null && "success" in result && (result as Row).success === false) {
        setError(id, str((result as Row).message)); return;
      }
      setRefundRows((old) => old.map((r) => r.id === row.id ? { ...r, status: decision === "approve" ? "PROCESSING" : "REJECTED" } : r));
      setSuccess(decision === "approve"
        ? "Refund submitted for Stripe processing. Final status follows the Stripe webhook."
        : "Refund request rejected.");
    });
  }

  return <div className="space-y-10">
    <header className="space-y-2">
      <p className="text-sm font-medium text-slate-500">Store management</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Orders, payments & refunds</h1>
      <p className="text-sm text-slate-600">Review order lifecycle, reconcile Stripe payment attempts and process eligible refund requests.</p>
      <div className="grid gap-3 pt-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Orders loaded</p><p className="mt-1 text-2xl font-semibold">{stats.orders}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Payment manual reviews</p><p className="mt-1 text-2xl font-semibold">{stats.manualReviews}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">Pending refund requests</p><p className="mt-1 text-2xl font-semibold">{stats.pendingRefunds}</p></div>
      </div>
      {success && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p>}
    </header>

    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Orders</h2><p className="text-sm text-slate-500">Latest orders. Only valid operational statuses should be selected.</p></div>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Order","Customer","Payment","Total","Created","Order status","Update"].map(x => <th key={x} className="px-4 py-3">{x}</th>)}</tr></thead>
          <tbody className="divide-y">
            {orderRows.map((r) => <tr key={str(r.id)}>
              <td className="px-4 py-3 font-medium">{str(r.orderNumber)}</td>
              <td className="px-4 py-3"><div>{str(r.customerName)}</div><div className="text-xs text-slate-500">{str(r.customerEmail)}</div></td>
              <td className="px-4 py-3">{str(r.paymentStatus)}</td>
              <td className="px-4 py-3">{money(r.totalAmount, str(r.currency).toUpperCase())}</td>
              <td className="px-4 py-3">{date(r.createdAt)}</td>
              <td className="px-4 py-3">{str(r.status)}</td>
              <td className="px-4 py-3">
                <select aria-label={`Update order ${str(r.orderNumber)} status`} defaultValue={str(r.status)} disabled={pending || r.status === "REFUNDED"} onChange={(e) => changeOrderStatus(r, e.target.value)} className="rounded-md border px-2 py-2">
                  {["PENDING_PAYMENT","PROCESSING","SHIPPED","DELIVERED","CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors[str(r.id)] && <ErrorBox message={errors[str(r.id)]} />}
              </td>
            </tr>)}
            {!orderRows.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No orders returned by the API.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Stripe payment manual review</h2><p className="text-sm text-slate-500">Queue for duplicate/late captures and payment reconciliation. Refund decisions remain webhook-confirmed.</p></div>
      <div className="space-y-3">
        {paymentRows.map((r) => {
          const order = nested(r, "order"); const id = str(r.id);
          return <article key={id} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{str(order.orderNumber)} · {money(r.amount, str(r.currency).toUpperCase())}</p><p className="text-xs text-slate-500">{str(r.status)} · {date(r.updatedAt)}</p></div><span className={`rounded-full px-3 py-1 text-xs ${r.requiresManualReview ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{r.requiresManualReview ? "Manual review" : "Recorded attempt"}</span></div>
            <p className="text-sm text-slate-700">{str(r.reviewReason)}</p>
            <textarea value={note(id)} onChange={(e) => setNotes(old => ({ ...old, [id]: e.target.value }))} rows={2} maxLength={500} placeholder="Resolution note (5–500 characters)" className="w-full rounded-md border px-3 py-2 text-sm" />
            {errors[id] && <ErrorBox message={errors[id]} />}
            <div className="flex flex-wrap gap-2"><button disabled={pending} onClick={() => resolvePayment(r, "REFUND")} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">Request Stripe refund</button><button disabled={pending} onClick={() => resolvePayment(r, "RESOLVE_NO_REFUND")} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Resolve without refund</button></div>
          </article>;
        })}
        {!paymentRows.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No payment attempts currently require manual review.</p>}
      </div>
    </section>

    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Refund requests</h2><p className="text-sm text-slate-500">Approve eligible requests or reject with a reason. Stripe webhook confirms the final refund result.</p></div>
      <div className="space-y-3">
        {refundRows.map((r) => {
          const order = nested(r, "order"); const customer = nested(r, "user"); const id = str(r.id);
          const canResolve = r.status === "PENDING" || r.status === "PROCESSING";
          return <article key={id} className="space-y-3 rounded-xl border bg-white p-4">
            <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{str(order.orderNumber)} · {money(r.amount, str(order.currency).toUpperCase())}</p><p className="text-xs text-slate-500">{str(customer.email)} · {date(r.createdAt)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{str(r.status)}</span></div>
            <p className="text-sm"><span className="font-medium">Reason:</span> {str(r.reason)}</p>
            {r.customerNote ? <p className="text-sm text-slate-600">{str(r.customerNote)}</p> : null}
            {canResolve && <><textarea value={note(id)} onChange={(e) => setNotes(old => ({ ...old, [id]: e.target.value }))} rows={2} maxLength={500} placeholder="Admin note / rejection reason" className="w-full rounded-md border px-3 py-2 text-sm" />{errors[id] && <ErrorBox message={errors[id]} />}<div className="flex flex-wrap gap-2"><button disabled={pending} onClick={() => resolveRefund(r, "approve")} className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50">Approve refund</button><button disabled={pending} onClick={() => resolveRefund(r, "reject")} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Reject request</button></div></>}
          </article>;
        })}
        {!refundRows.length && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">No refund requests found.</p>}
      </div>
    </section>
  </div>;
}
