import { getAdminOrders } from "@/service/order.service";
import { AdminOperationsClient } from "@/components/admin/admin-operations-client";

export default async function AdminOrdersPage() {
  const [orders, payments, refunds] = await Promise.all([
    getAdminOrders({ page: 1, limit: 50 }),
    import("@/service/payment.service").then((m) => m.getPaymentsForManualReview()),
    import("@/service/refund.service").then((m) => m.getAdminRefundRequests()),
  ]);
  return <AdminOperationsClient orders={orders} payments={payments} refunds={refunds} />;
}
