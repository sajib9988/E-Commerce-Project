import { getAdminProducts } from "@/service/product.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminProductsPage() {
  const result = await getAdminProducts({ page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
  return <AdminResourcePage title="Products" description="Products and catalog records loaded from the NestJS Products API." result={result} columns={[
    { label: "Product", key: "name" }, { label: "Slug", key: "slug" }, { label: "SKU", key: "sku" },
    { label: "Regular price", key: "regularPrice" }, { label: "Sale price", key: "salePrice" },
    { label: "Active", key: "isActive" }, { label: "Created", key: "createdAt" },
  ]} emptyMessage="No products found." />;
}
