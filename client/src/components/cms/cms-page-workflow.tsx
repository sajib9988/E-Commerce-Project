"use client";
import { useState } from "react";
import Link from "next/link";
import { PageEditor, type PageFormData } from "@/components/cms/page-editor";
import PublicPageRenderer from "@/components/cms/public-page-renderer";
import type { CmsPage } from "@/type/cms";
export function CmsPageWorkflow({ initialPage, onSave, onPublish }: {
  initialPage: CmsPage; onSave: (data: PageFormData) => Promise<CmsPage | void>; onPublish: () => Promise<CmsPage | void>;
}) {
  const [page, setPage] = useState(initialPage); const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false); const [error, setError] = useState("");
  const save = async (data: PageFormData) => { const updated = await onSave(data); if (updated) setPage(updated); return updated; };
  const publish = async () => { setPublishing(true); setError(""); try { const updated = await onPublish(); if (updated) setPage(updated); } catch (e) { setError(e instanceof Error ? e.message : "Publish failed"); } finally { setPublishing(false); } };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/admin/cms" className="text-sm font-medium text-slate-600">← Back to CMS pages</Link><div className="flex gap-2">
      <button type="button" onClick={() => setPreview((v) => !v)} className="rounded-lg border px-4 py-2 text-sm font-semibold">{preview ? "Back to editor" : "Preview page"}</button>
      <button type="button" disabled={publishing || page.status === "PUBLISHED"} onClick={() => void publish()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{publishing ? "Publishing…" : page.status === "PUBLISHED" ? "Published" : "Publish"}</button>
    </div></div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {preview ? <div className="overflow-hidden rounded-2xl border bg-white"><div className="border-b bg-slate-50 px-5 py-3"><p className="font-semibold">{page.name} — Preview</p><p className="text-xs text-slate-500">Draft preview. This does not change public visibility.</p></div><PublicPageRenderer page={page}/></div> : <PageEditor key={page.id} page={page} onSave={save}/>}
  </div>;
}