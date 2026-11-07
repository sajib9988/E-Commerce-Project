"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { createApliiqArtwork, registerProductImageAsApliiqArtwork } from "@/service/admin.service";

const styles = [
  ["CARTOON", "Cartoon"], ["REALISTIC", "Realistic"], ["ANIME", "Anime"],
  ["ABSTRACT", "Abstract"], ["TYPOGRAPHY", "Typography"], ["MINIMALIST", "Minimalist"],
  ["VINTAGE", "Vintage"], ["ILLUSTRATION", "Illustration"], ["OTHER", "Other"],
] as const;

type Artwork = { id: string; name: string; style: string; imageUrl: string; apliiqArtworkId?: string | null };

export function ArtworkManager({ productId, productImageUrl, artworks }: {
  productId: string; productImageUrl: string | null; artworks: Artwork[];
}) {
  const [name, setName] = useState("");
  const [style, setStyle] = useState("OTHER");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { toast.error("Choose a print-ready artwork image."); return; }
    const data = new FormData();
    data.append("name", name.trim());
    data.append("style", style);
    data.append("image", file);
    setBusy(true);
    try {
      const result = await createApliiqArtwork(productId, data);
      if (typeof result === "object" && result !== null && "success" in result && result.success === false) {
        toast.error("message" in result ? String(result.message) : "Artwork upload failed.");
        return;
      }
      toast.success("Artwork uploaded and registered with Apliiq.");
      setName(""); setFile(null); setStyle("OTHER");
      window.location.reload();
    } catch { toast.error("Unable to upload artwork."); }
    finally { setBusy(false); }
  }

  async function registerProductImage() {
    setBusy(true);
    try {
      const result = await registerProductImageAsApliiqArtwork(productId, name.trim() || undefined, style);
      if (typeof result === "object" && result !== null && "success" in result && result.success === false) {
        toast.error("message" in result ? String(result.message) : "Could not register product image.");
        return;
      }
      toast.success("Product image registered as Apliiq artwork.");
      window.location.reload();
    } catch { toast.error("Could not register product image."); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="mb-4">
      <h2 className="font-semibold text-slate-950">Artwork and design style</h2>
      <p className="mt-1 text-sm text-slate-500">Each uploaded artwork has its own style, independent of the product category.</p>
    </div>
    {artworks.length > 0 ? <div className="mb-5 grid gap-3 sm:grid-cols-2">
      {artworks.map((artwork) => <div key={artwork.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
        <img src={artwork.imageUrl} alt={artwork.name} className="size-16 rounded-lg bg-slate-100 object-contain" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{artwork.name}</p>
          <p className="text-xs text-slate-500">{styles.find(([value]) => value === artwork.style)?.[1] ?? "Other"}</p>
          <p className="mt-1 text-[11px] text-slate-400">{artwork.apliiqArtworkId ? "Linked to Apliiq" : "Not linked to Apliiq"}</p>
        </div>
      </div>)}
    </div> : <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No artwork has been added to this product yet.</p>}
    <form onSubmit={upload} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium text-slate-700">Artwork name
        <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={50} placeholder="e.g. Mountain sunset illustration" className="h-10 rounded-lg border border-slate-200 px-3" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">Design style
        <select value={style} onChange={(event) => setStyle(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3">
          {styles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium text-slate-700">Print-ready artwork file
        <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-200 p-2 text-sm" />
      </label>
      <button type="submit" disabled={busy || !file} className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Uploading…" : "Upload artwork to Apliiq"}</button>
    </form>
    {productImageUrl && <button type="button" disabled={busy} onClick={registerProductImage} className="mt-3 h-10 w-full rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">
      Use product image as artwork
    </button>}
  </section>;
}
