import { getAdminRows } from "@/components/admin/admin-resource-page";
import { getAdminProducts, getSizeTemplates } from "@/service/product.service";
import { AdminVariantsClient } from "@/components/admin/admin-variants-client";

type Product = {
  id: string;
  name: string;
  sku?: string | null;
  subcategory?: { name?: string; sizeTemplateId?: string | null } | null;
};
type Template = {
  id: string;
  name: string;
  sizes?: Array<{ id: string; label: string; sortOrder?: number; isActive?: boolean }>;
};
function isApiError(value: unknown): value is { success: false; message: string } {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
export default async function AdminVariantsPage() {
  const [productsResult, templatesResult] = await Promise.all([
    getAdminProducts({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" }),
    getSizeTemplates(),
  ]);
  const products = getAdminRows(productsResult) as unknown as Product[];
  const templates = getAdminRows(templatesResult) as unknown as Template[];
  const error = isApiError(productsResult) ? productsResult.message
    : isApiError(templatesResult) ? templatesResult.message : undefined;
  return <AdminVariantsClient products={products} templates={templates} initialError={error} />;
}
