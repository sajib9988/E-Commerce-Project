import { getAdminProducts } from "@/service/product.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminInventoryPage() {
  const result = await getAdminProducts({ page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
  return <AdminResourcePage title="Inventory" description="Inventory is sourced from product records. Variant-level stock is available from the Product Variants API; a separate stock-adjustment API is not exposed in the current backend." result={result} columns={[
    { label: "Product", key: "name" }, { label: "SKU", key: "sku" }, { label: "Product stock", key: "stockQuantity" },
    { label: "Active", key: "isActive" }, { label: "Variants", key: "variants" },
  ]} emptyMessage="No inventory records found." />;
}
