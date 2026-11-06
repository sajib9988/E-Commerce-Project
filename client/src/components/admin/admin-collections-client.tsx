"use client";

import { useState } from "react";
import { useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Archive, ImagePlus, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { archiveCollection, createCollection, updateCollection } from "@/service/collection.service";

type Collection = {
  id: string; name: string; slug: string; description?: string | null;
  bannerImage?: string | null; thumbnail?: string | null; isActive: boolean;
  isFeatured: boolean; sortOrder: number; _count?: { products: number };
};
type Values = {
  name: string; slug: string; description: string; bannerImage: string;
  thumbnail: string; isActive: boolean; isFeatured: boolean; sortOrder: string;
};
const schema = z.object({
  name: z.string().trim().min(1, "Collection name is required").max(120),
  slug: z.string().trim().min(1, "Slug is required").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  description: z.string().max(2000),
  bannerImage: z.string().refine((value) => value === "" || /^https?:\/\//i.test(value), "Enter a valid image URL"),
  thumbnail: z.string().refine((value) => value === "" || /^https?:\/\//i.test(value), "Enter a valid image URL"),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.string().regex(/^\d+$/, "Sort order must be zero or a positive integer"),
});
type ApiError = { success: false; message: string };
function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}
function rowsFrom(value: unknown): Collection[] {
  if (Array.isArray(value)) return value as Collection[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as Collection[];
  if (Array.isArray(record.data)) return record.data as Collection[];
  if (record.data && typeof record.data === "object" && Array.isArray((record.data as Record<string, unknown>).items)) return (record.data as { items: Collection[] }).items;
  return [];
}
const emptyValues: Values = { name: "", slug: "", description: "", bannerImage: "", thumbnail: "", isActive: true, isFeatured: false, sortOrder: "0" };

export function AdminCollectionsClient({ initialResult }: { initialResult: unknown }) {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>(() => rowsFrom(initialResult));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const initialError = isApiError(initialResult) ? initialResult.message : "";
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: emptyValues });
  const thumbnail = useWatch({ control: form.control, name: "thumbnail" });
  const bannerImage = useWatch({ control: form.control, name: "bannerImage" });
  const imagePreview = thumbnail || bannerImage;

  function resetForm() {
    setEditingId(null);
    form.reset(emptyValues);
  }
  function edit(item: Collection) {
    setEditingId(item.id);
    form.reset({
      name: item.name, slug: item.slug, description: item.description ?? "",
      bannerImage: item.bannerImage ?? "", thumbnail: item.thumbnail ?? "",
      isActive: item.isActive, isFeatured: item.isFeatured, sortOrder: String(item.sortOrder ?? 0),
    });
  }
  async function submit(values: Values) {
    setSaving(true);
    const payload = {
      name: values.name.trim(), slug: values.slug.trim().toLowerCase(),
      description: values.description.trim() || undefined,
      bannerImage: values.bannerImage.trim() || undefined,
      thumbnail: values.thumbnail.trim() || undefined,
      isActive: values.isActive, isFeatured: values.isFeatured,
      sortOrder: Number(values.sortOrder),
    };
    try {
      const result = editingId ? await updateCollection(editingId, payload) : await createCollection(payload);
      if (isApiError(result)) { toast.error(result.message); return; }
      toast.success(editingId ? "Collection updated." : "Collection created.");
      resetForm();
      router.refresh();
      if (editingId) setCollections((current) => current.map((item) => item.id === editingId ? { ...item, ...payload } : item));
    } catch { toast.error("Could not save collection."); }
    finally { setSaving(false); }
  }
  async function archive(item: Collection) {
    if (!window.confirm(`Archive collection "${item.name}"? Products will not be deleted.`)) return;
    setBusyId(item.id);
    try {
      const result = await archiveCollection(item.id);
      if (isApiError(result)) { toast.error(result.message); return; }
      setCollections((current) => current.filter((collection) => collection.id !== item.id));
      toast.success("Collection archived.");
      router.refresh();
    } catch { toast.error("Could not archive collection."); }
    finally { setBusyId(null); }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-slate-500">Catalog management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Collections</h1><p className="mt-2 text-sm text-slate-600">Create and organize storefront collections.</p></div>
      <Button type="button" variant="outline" onClick={resetForm}><Plus className="mr-2 size-4" /> New collection</Button>
    </header>
    {initialError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{initialError}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">{editingId ? "Edit collection" : "Create collection"}</h2><p className="mt-1 text-xs text-slate-500">Collection images use existing hosted image URLs.</p></div>{editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X className="mr-1 size-4" /> Cancel</Button>}</div>
      <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Collection name *</FormLabel><FormControl><Input {...field} placeholder="Summer Essentials" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="slug" render={({ field }) => <FormItem><FormLabel>URL slug *</FormLabel><FormControl><Input {...field} placeholder="summer-essentials" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="sortOrder" render={({ field }) => <FormItem><FormLabel>Sort order *</FormLabel><FormControl><Input {...field} type="number" min="0" step="1" /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="bannerImage" render={({ field }) => <FormItem><FormLabel>Banner image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="thumbnail" render={({ field }) => <FormItem><FormLabel>Thumbnail image URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>} />
          <div className="flex items-end"><p className="text-xs text-slate-500">Use a Cloudinary or Media Library URL. Upload support can be added through the existing Media API later.</p></div>
          <FormField control={form.control} name="description" render={({ field }) => <FormItem className="md:col-span-2 xl:col-span-3"><FormLabel>Description</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="Describe this collection..." /></FormControl><FormMessage /></FormItem>} />
        </div>
        {imagePreview && <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Collection preview" className="h-20 w-32 rounded-lg bg-slate-50 object-cover" />
          <span className="text-xs text-slate-500">Image preview</span>
        </div>}
        <div className="flex flex-wrap gap-6">
          <FormField control={form.control} name="isActive" render={({ field }) => <FormItem className="flex items-center gap-2 space-y-0"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-slate-900" /></FormControl><FormLabel className="cursor-pointer">Active</FormLabel></FormItem>} />
          <FormField control={form.control} name="isFeatured" render={({ field }) => <FormItem className="flex items-center gap-2 space-y-0"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-slate-900" /></FormControl><FormLabel className="cursor-pointer">Featured</FormLabel></FormItem>} />
        </div>
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{saving ? "Saving..." : editingId ? "Save changes" : "Create collection"}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}</div>
      </form></Form>
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Collection list</h2><p className="text-xs text-slate-500">{collections.length} record(s)</p></div>
      {collections.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No collections found.</p> : <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Collection</th><th className="px-5 py-3">Slug</th><th className="px-5 py-3">Products</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{collections.map((item) => <tr key={item.id}>
            <td className="px-5 py-4 font-medium">{item.name}<span className="block text-xs text-slate-500">{item.isFeatured ? "Featured" : "Standard"} · Sort {item.sortOrder}</span></td><td className="px-5 py-4 font-mono text-xs">{item.slug}</td><td className="px-5 py-4">{item._count?.products ?? "—"}</td>
            <td className="px-5 py-4"><span className={item.isActive ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>{item.isActive ? "Active" : "Inactive"}</span></td>
            <td className="px-5 py-4"><div className="flex justify-end gap-2"><Button size="sm" type="button" variant="outline" onClick={() => edit(item)}><Pencil className="mr-1 size-3.5" /> Edit</Button>{item.isActive && <Button size="sm" type="button" variant="destructive" disabled={busyId === item.id} onClick={() => archive(item)}>{busyId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="mr-1 size-3.5" />} Archive</Button>}</div></td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
