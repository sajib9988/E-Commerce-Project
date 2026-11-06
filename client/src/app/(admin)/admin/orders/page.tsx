import { getAdminOrders } from "@/service/order.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminOrdersPage() {
  const result = await getAdminOrders({ page: 1, limit: 50 });
  return <AdminResourcePage title="Orders" description="Customer orders, payment state and order lifecycle from the admin Orders API." result={result} columns={[
    { label: "Order number", key: "orderNumber" }, { label: "Customer", key: "customerName" },
    { label: "Email", key: "customerEmail" }, { label: "Payment", key: "paymentStatus" },
    { label: "Order status", key: "status" }, { label: "Total (USD)", key: "totalAmount" },
    { label: "Created", key: "createdAt" },
  ]} emptyMessage="No orders found." />;
}
