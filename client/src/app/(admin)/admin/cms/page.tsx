import { getAllPages } from "@/service/cms.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminCmsPage() {
  const result = await getAllPages();
  return <AdminResourcePage title="CMS pages" description="Page records from the CMS Pages API. Editing and publishing use the existing cms.service.ts actions." result={result} columns={[
    { label: "Page", key: "name" }, { label: "Slug", key: "slug" }, { label: "Status", key: "status" },
    { label: "Blocks", key: "_count.blocks" }, { label: "Updated", key: "updatedAt" },
  ]} emptyMessage="No CMS pages found." />;
}
