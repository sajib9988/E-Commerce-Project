import { getPaymentsForManualReview } from "@/service/payment.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminPaymentsPage() {
  const result = await getPaymentsForManualReview();
  return <AdminResourcePage title="Payments & manual review" description="Stripe payment attempts requiring manual review. This is the backend's current admin payment queue, not a complete payment ledger." result={result} columns={[
    { label: "Order", key: "order.orderNumber" }, { label: "Order status", key: "order.status" },
    { label: "Payment status", key: "status" }, { label: "Amount", key: "amount" },
    { label: "Currency", key: "currency" }, { label: "Review reason", key: "reviewReason" },
    { label: "Updated", key: "updatedAt" },
  ]} emptyMessage="No payment attempts currently require manual review." />;
}
