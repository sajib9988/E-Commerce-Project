import { getAdminReviews } from "@/service/review.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminReviewsPage() {
  const result = await getAdminReviews();
  return <AdminResourcePage title="Product reviews" description="Customer feedback and moderation status from the Reviews API." result={result} columns={[
    { label: "Product", key: "product.name" }, { label: "Customer", key: "user.name" },
    { label: "Email", key: "user.email" }, { label: "Rating", key: "rating" },
    { label: "Status", key: "status" }, { label: "Order", key: "order.orderNumber" },
    { label: "Created", key: "createdAt" },
  ]} emptyMessage="No customer reviews found." />;
}
