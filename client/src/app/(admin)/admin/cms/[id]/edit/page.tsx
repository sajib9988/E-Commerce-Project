import { notFound } from "next/navigation";
import { CmsPageWorkflow } from "@/components/cms/cms-page-workflow";
import { getPageById, updatePage, publishPage } from "@/service/cms.service";
import type { PageFormData } from "@/components/cms/page-editor";
import type { CmsPage } from "@/type/cms";
export default async function EditCmsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const page = await getPageById(id);
  if (!page || typeof page !== "object" || ("success" in page && page.success === false) || !("id" in page)) notFound();
  async function savePage(data: PageFormData) {
    "use server";
    const sections = data.sections.map((section, sectionIndex) => ({
      id: section.id,
      name: section.name,
      isVisible: section.isVisible,
      settings: section.settings,
      sortOrder: sectionIndex,
      blocks: section.blocks.map((block, blockIndex) => ({
        id: block.id,
        type: block.type,
        content: block.content,
        settings: block.settings,
        isVisible: block.isVisible,
        sortOrder: blockIndex,
      })),
    }));
    const result = await updatePage(id, { ...data, sections });
    if (result && typeof result === "object" && "success" in result && result.success === false) throw new Error(String(result.message ?? "Unable to save page"));
    return result as CmsPage;
  }
  async function publishCurrentPage() {
    "use server"; const result = await publishPage(id);
    if (result && typeof result === "object" && "success" in result && result.success === false) throw new Error(String(result.message ?? "Unable to publish page"));
    return result as CmsPage;
  }
  return <CmsPageWorkflow initialPage={page as CmsPage} onSave={savePage} onPublish={publishCurrentPage}/>;
}