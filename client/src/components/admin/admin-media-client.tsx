"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia, getMediaUsage, updateMedia, uploadMedia } from "@/service/media.service";
import type { MediaAsset, MediaUsage } from "@/type/cms";

type ApiError = { success: false; message?: string };
function isError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && (value as ApiError).success === false;
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "video/mp4", "video/webm"]);
const maxBytes = 50 * 1024 * 1024;

export function AdminMediaClient({ initialMedia }: { initialMedia: MediaAsset[] }) {
  const router = useRouter();
  const [media, setMedia] = useState(initialMedia);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { name: string; altText: string }>>({});
  const [usage, setUsage] = useState<Record<string, MediaUsage>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const visibleMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? media.filter((asset) => (asset.name + " " + (asset.altText ?? "")).toLowerCase().includes(term)) : media;
  }, [media, search]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!file) { setError("Choose an image or video file first."); return; }
    if (!allowedTypes.has(file.type)) { setError("Supported formats: JPG, PNG, WebP, GIF, AVIF, MP4 and WebM."); return; }
    if (file.size > maxBytes) { setError("File size must be 50 MB or less."); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("altText", altText.trim());
    setUploading(true);
    const result = await uploadMedia(formData);
    setUploading(false);
    if (isError(result)) { setError(result.message || "Upload failed."); return; }
    setMedia((old) => [result as MediaAsset, ...old]);
    setFile(null);
    setAltText("");
    setMessage("Media uploaded to Cloudinary and saved to the media library.");
    router.refresh();
  }

  function draftFor(asset: MediaAsset) {
    return drafts[asset.id] ?? { name: asset.name, altText: asset.altText ?? "" };
  }

  async function saveMetadata(asset: MediaAsset) {
    const draft = draftFor(asset);
    if (!draft.name.trim()) { setError("Media name cannot be empty."); return; }
    setBusyId(asset.id);
    setError("");
    setMessage("");
    const result = await updateMedia(asset.id, { name: draft.name.trim(), altText: draft.altText.trim() });
    setBusyId(null);
    if (isError(result)) { setError(result.message || "Unable to update media."); return; }
    setMedia((old) => old.map((item) => item.id === asset.id ? { ...item, ...draft } : item));
    setMessage("Media details updated.");
    router.refresh();
  }

  async function inspectUsage(asset: MediaAsset) {
    setBusyId(asset.id);
    setError("");
    const result = await getMediaUsage(asset.id);
    setBusyId(null);
    if (isError(result)) { setError(result.message || "Unable to inspect media usage."); return; }
    setUsage((old) => ({ ...old, [asset.id]: result as MediaUsage }));
  }

  async function removeAsset(asset: MediaAsset) {
    setError("");
    setMessage("");
    setBusyId(asset.id);
    const usageResult = await getMediaUsage(asset.id);
    if (isError(usageResult)) {
      setBusyId(null);
      setError(usageResult.message || "Unable to check whether this asset is in use.");
      return;
    }
    const currentUsage = usageResult as MediaUsage;
    setUsage((old) => ({ ...old, [asset.id]: currentUsage }));
    if (currentUsage.pages.length > 0) {
      setBusyId(null);
      setError("This file is used by CMS content. Remove its references before deleting it.");
      return;
    }
    if (!window.confirm("Permanently delete this media file from Cloudinary and the database?")) {
      setBusyId(null);
      return;
    }
    const result = await deleteMedia(asset.id);
    setBusyId(null);
    if (isError(result)) { setError(result.message || "Delete failed."); return; }
    setMedia((old) => old.filter((item) => item.id !== asset.id));
    setMessage("Media deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-slate-500">CMS assets</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Media library</h1>
        <p className="text-sm text-slate-600">Upload images and videos to Cloudinary, edit accessible metadata, inspect CMS usage and safely delete unused files.</p>
      </header>

      <form onSubmit={handleUpload} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="space-y-2 text-sm font-medium text-slate-700">Choose file
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-200 p-2 text-sm" />
          <span className="block text-xs font-normal text-slate-500">JPG, PNG, WebP, GIF, AVIF, MP4 or WebM · max 50 MB</span>
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">Alt text
          <input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={500} placeholder="Describe the image for accessibility" className="block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" />
        </label>
        <button type="submit" disabled={uploading || !file} className="h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50">{uploading ? "Uploading..." : "Upload media"}</button>
      </form>

      {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Library assets <span className="text-sm font-normal text-slate-500">({media.length})</span></h2>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or alt text" aria-label="Search media" className="h-10 w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 text-sm" />
      </div>

      {visibleMedia.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No matching media assets.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleMedia.map((asset) => {
            const draft = draftFor(asset);
            const assetUsage = usage[asset.id];
            const busy = busyId === asset.id;
            return (
              <article key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-slate-100">
                  {asset.type === "VIDEO" ? <video src={asset.url} controls className="h-full w-full object-contain" /> : <img src={asset.url} alt={asset.altText || asset.name} className="h-full w-full object-contain" />}
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{asset.type}</span><a href={asset.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">Open original</a></div>
                  <label className="block space-y-1 text-xs font-medium text-slate-600">Name
                    <input value={draft.name} onChange={(event) => setDrafts((old) => ({ ...old, [asset.id]: { ...draft, name: event.target.value } }))} maxLength={255} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm text-slate-900" />
                  </label>
                  <label className="block space-y-1 text-xs font-medium text-slate-600">Alt text
                    <input value={draft.altText} onChange={(event) => setDrafts((old) => ({ ...old, [asset.id]: { ...draft, altText: event.target.value } }))} maxLength={500} className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm text-slate-900" />
                  </label>
                  <p className="break-all text-[11px] text-slate-400">{asset.id} · {asset.width ?? "?"} × {asset.height ?? "?"}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => saveMetadata(asset)} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save details</button>
                    <button type="button" disabled={busy} onClick={() => inspectUsage(asset)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Check usage</button>
                    <button type="button" disabled={busy} onClick={() => removeAsset(asset)} className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Delete</button>
                  </div>
                  {assetUsage && <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="font-semibold">{assetUsage.pages.length} CMS page(s) reference this asset</p>
                    {assetUsage.pages.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-4">{assetUsage.pages.map((page) => <li key={page.id}>{page.name} <span className="text-slate-400">({page.slug})</span></li>)}</ul>}
                    {assetUsage.pages.length === 0 && <p className="mt-1 text-emerald-700">No CMS page references found. This asset can be deleted.</p>}
                  </div>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
