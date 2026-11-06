import { getAdminOrders } from "@/service/order.service";
import { getAdminRows } from "@/components/admin/admin-resource-page";
import { ApliiqOrdersTable } from "@/components/admin/apliiq-orders-table";

export default async function AdminApliiqPage() {
  const result = await getAdminOrders({ page: 1, limit: 100 });
  const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;
  if (failed) {
    const message = "message" in result ? String(result.message) : "Unable to load orders.";
    return <div className="space-y-4"><h1 className="text-3xl font-bold">Apliiq fulfillment</h1><p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{message}</p></div>;
  }
  const orders = getAdminRows(result).filter((order) => Array.isArray(order.fulfillments) && order.fulfillments.some((fulfillment) => typeof fulfillment === "object" && fulfillment !== null && "provider" in fulfillment && fulfillment.provider === "APLIIQ"));
  return (
    <div className="space-y-6">
      <header><p className="text-sm font-medium text-slate-500">Fulfillment operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Apliiq fulfillment</h1><p className="mt-2 text-sm text-slate-600">Review provider submission state, external order IDs, tracking and reconciliation errors. Cancellation remains a separate provider-side workflow.</p></header>
      <ApliiqOrdersTable orders={orders as never[]} />
    </div>
  );
}
