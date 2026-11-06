import { getAdminProducts } from "@/service/product.service";
import { getAdminRows } from "@/components/admin/admin-resource-page";
import { AdminProductsClient } from "@/components/admin/admin-products-client";

export default async function AdminProductsPage() {
  const result = await getAdminProducts({ page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
  const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;
  const error = failed && "message" in result ? String(result.message) : undefined;
  const products = getAdminRows(result) as Array<{
    id: string; name?: string; sku?: string | null; regularPrice?: number | string;
    salePrice?: number | string | null; stockQuantity?: number; isActive?: boolean;
    imageUrl?: string | null; category?: { name?: string } | null;
  }>;

  return <AdminProductsClient products={products} error={error} />;
}
