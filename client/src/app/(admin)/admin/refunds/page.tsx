import { getAdminRefundRequests } from "@/service/refund.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminRefundsPage() {
  const result = await getAdminRefundRequests();
  return <AdminResourcePage title="Refund requests" description="Customer refund requests from the Refunds API. Provider cancellation and refund eligibility remain separate workflows." result={result} columns={[
    { label: "Order", key: "order.orderNumber" }, { label: "Customer", key: "user.email" },
    { label: "Reason", key: "reason" }, { label: "Status", key: "status" },
    { label: "Customer note", key: "customerNote" }, { label: "Created", key: "createdAt" },
  ]} emptyMessage="No refund requests found." />;
}
