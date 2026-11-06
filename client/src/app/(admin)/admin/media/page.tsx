import { AdminMediaClient } from "@/components/admin/admin-media-client";
import { getAllMedia } from "@/service/media.service";
import type { MediaAsset } from "@/type/cms";

export default async function AdminMediaPage() {
  const result = await getAllMedia();
  if (typeof result === "object" && result !== null && "success" in result && result.success === false) {
    return <div className="space-y-4"><h1 className="text-3xl font-bold">Media library</h1><p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{String(result.message)}</p></div>;
  }
  return <AdminMediaClient initialMedia={Array.isArray(result) ? result as MediaAsset[] : []} />;
}
