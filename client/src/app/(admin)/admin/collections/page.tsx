import { getAdminCollections } from "@/service/collection.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminCollectionsPage() {
  const result = await getAdminCollections({ page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" });
  return <AdminResourcePage title="Collections" description="Manage the storefront collections returned by the Collections API." result={result} columns={[
    { label: "Name", key: "name" }, { label: "Slug", key: "slug" }, { label: "Active", key: "isActive" },
    { label: "Featured", key: "isFeatured" }, { label: "Sort order", key: "sortOrder" }, { label: "Created", key: "createdAt" },
  ]} emptyMessage="No collections found." />;
}
