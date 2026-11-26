import { getAdminRows } from "@/components/admin/admin-resource-page";
import { AdminCategoriesClient } from "@/components/admin/admin-categories-client";
import { getAdminCategories } from "@/service/admin.service";

export const instant = false;

export default async function AdminCategoriesPage() {
  const result = await getAdminCategories();
  const failed = typeof result === "object" && result !== null && "success" in result && result.success === false;

  return (
    <AdminCategoriesClient
      initialCategories={getAdminRows(result)}
      initialError={failed && "message" in result ? String(result.message) : undefined}
    />
  );
}
