import { getAllMedia } from "@/service/media.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminMediaPage() {
  const result = await getAllMedia();
  return <AdminResourcePage title="Media library" description="Cloudinary media assets and metadata from the CMS Media API." result={result} columns={[
    { label: "Name", key: "name" }, { label: "File", key: "publicId" }, { label: "Type", key: "resourceType" },
    { label: "Format", key: "format" }, { label: "Alt text", key: "altText" }, { label: "Created", key: "createdAt" },
  ]} emptyMessage="No media assets found." />;
}
