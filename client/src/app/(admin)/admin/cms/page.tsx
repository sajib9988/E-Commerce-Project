import { getAllPages } from "@/service/cms.service";
import { CmsPagesClient } from "@/components/cms/cms-pages-client";
import type { CmsPageListItem } from "@/type/cms";
export default async function AdminCmsPage() {
  const result = await getAllPages();
  if (result && typeof result === "object" && "success" in result && result.success === false) return <CmsPagesClient pages={[]} error={String(result.message ?? "Unable to load CMS pages")}/>;
  return <CmsPagesClient pages={(Array.isArray(result) ? result : []) as CmsPageListItem[]}/>;
}