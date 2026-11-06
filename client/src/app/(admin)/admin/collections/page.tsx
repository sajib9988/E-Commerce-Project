import { AdminCollectionsClient } from "@/components/admin/admin-collections-client";
import { getAdminCollections } from "@/service/collection.service";

export default async function AdminCollectionsPage() {
  const result = await getAdminCollections({ page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" });
  return <AdminCollectionsClient initialResult={result} />;
}
