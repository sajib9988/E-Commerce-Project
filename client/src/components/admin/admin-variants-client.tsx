"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Archive, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { archiveProductVariant, createProductVariant, getAdminProductVariants, updateProductVariant } from "@/service/product.service";

type Product = { id: string; name: string; sku?: string | null; subcategory?: { name?: string; sizeTemplateId?: string | null } | null };
type Size = { id: string; label: string; isActive?: boolean };
type Template = { id: string; name: string; sizes?: Size[] };
type Variant = {
  id: string; sku: string; regularPrice: number | string; salePrice?: number | string | null;
  stockQuantity: number; isActive: boolean; apliiqVariantSku?: string | null;
  colorName?: string | null; colorHex?: string | null; apliiqColorId?: string | null;
  size: { id: string; label: string; template?: { name: string } };
};
type Values = {
  productId: string; sizeId: string; sku: string; regularPrice: string; salePrice: string;
  stockQuantity: string; apliiqVariantSku: string; colorName: string; colorHex: string;
  apliiqColorId: string; isActive: boolean;
};

const schema = z.object({
  productId: z.string().min(1, "Select a product"),
  sizeId: z.string().min(1, "Select a size"),
  sku: z.string().trim().min(1, "SKU is required").max(100),
  regularPrice: z.string().min(1, "Regular price is required").refine((v) => Number.isFinite(Number(v)) && Number(v) >= 0, "Enter a valid price"),
  salePrice: z.string().refine((v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0), "Enter a valid sale price"),
  stockQuantity: z.string().regex(/^\\d+$/, "Stock must be a whole number"),
  apliiqVariantSku: z.string().max(160),
  colorName: z.string().max(100),
  colorHex: z.string().refine((v) => v === "" || /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(v), "Use a valid hex color"),
  apliiqColorId: z.string().max(100),
  isActive: z.boolean(),
}).refine((v) => v.salePrice === "" || Number(v.salePrice) < Number(v.regularPrice), {
  message: "Sale price must be lower than regular price", path: ["salePrice"],
});

const defaults = (productId: string): Values => ({
  productId, sizeId: "", sku: "", regularPrice: "", salePrice: "", stockQuantity: "0",
  apliiqVariantSku: "", colorName: "", colorHex: "", apliiqColorId: "", isActive: true,
});
const isError = (v: unknown): v is { success: false; message: string } =>
  typeof v === "object" && v !== null && "success" in v && v.success === false;
function rowsFrom(value: unknown): Variant[] {
  if (Array.isArray(value)) return value as Variant[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.items)) return record.items as Variant[];
  if (Array.isArray(record.data)) return record.data as Variant[];
  if (record.data && typeof record.data === "object" && Array.isArray((record.data as Record<string, unknown>).items)) {
    return (record.data as { items: Variant[] }).items;
  }
  return [];
}

export function AdminVariantsClient({ products, templates, initialError }: {
  products: Product[]; templates: Template[]; initialError?: string;
}) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(initialError ?? "");
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(products[0]?.id ?? "") });
  const productId = useWatch({ control: form.control, name: "productId" });
  const product = products.find((item) => item.id === productId);
  const assignedTemplateId = product?.subcategory?.sizeTemplateId;
  const availableTemplates = useMemo(
    () => assignedTemplateId ? templates.filter((item) => item.id === assignedTemplateId) : templates,
    [assignedTemplateId, templates],
  );
  const sizes = availableTemplates.flatMap((template) =>
    (template.sizes ?? []).filter((size) => size.isActive !== false).map((size) => ({ ...size, templateName: template.name })),
  );

  useEffect(() => {
    if (!productId) { setVariants([]); return; }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setEditingId(null);
    form.setValue("sizeId", "");
    getAdminProductVariants(productId).then((result) => {
      if (cancelled) return;
      if (isError(result)) { setLoadError(result.message); setVariants([]); }
      else setVariants(rowsFrom(result));
    }).catch(() => {
      if (!cancelled) setLoadError("Could not load variants.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [productId, form]);

  function resetForm() {
    setEditingId(null);
    form.reset(defaults(productId ?? ""));
  }
  function editVariant(item: Variant) {
    setEditingId(item.id);
    form.reset({
      productId: productId ?? "", sizeId: item.size.id, sku: item.sku,
      regularPrice: String(item.regularPrice), salePrice: item.salePrice == null ? "" : String(item.salePrice),
      stockQuantity: String(item.stockQuantity ?? 0), apliiqVariantSku: item.apliiqVariantSku ?? "",
      colorName: item.colorName ?? "", colorHex: item.colorHex ?? "", apliiqColorId: item.apliiqColorId ?? "",
      isActive: item.isActive,
    });
  }
  async function submit(values: Values) {
    setSaving(true);
    const payload = {
      sku: values.sku.trim(), regularPrice: Number(values.regularPrice),
      salePrice: values.salePrice === "" ? null : Number(values.salePrice),
      stockQuantity: Number(values.stockQuantity), apliiqVariantSku: values.apliiqVariantSku.trim() || null,
      colorName: values.colorName.trim() || null, colorHex: values.colorHex.trim() || null,
      apliiqColorId: values.apliiqColorId.trim() || null, isActive: values.isActive,
    };
    try {
      const result = editingId
        ? await updateProductVariant(editingId, payload)
        : await createProductVariant({ ...payload, productId: values.productId, sizeId: values.sizeId });
      if (isError(result)) { toast.error(result.message); return; }
      toast.success(editingId ? "Variant updated." : "Variant created.");
      resetForm();
      const refreshed = await getAdminProductVariants(productId ?? "");
      if (isError(refreshed)) setLoadError(refreshed.message);
      else setVariants(rowsFrom(refreshed));
    } catch {
      toast.error("Could not save variant. Please try again.");
    } finally { setSaving(false); }
  }
  async function archive(item: Variant) {
    if (!window.confirm(`Archive variant "${item.sku}"? It will no longer be available for purchase.`)) return;
    setBusyId(item.id);
    try {
      const result = await archiveProductVariant(item.id);
      if (isError(result)) { toast.error(result.message); return; }
      setVariants((current) => current.map((variant) => variant.id === item.id ? { ...variant, isActive: false } : variant));
      toast.success("Variant archived.");
    } catch { toast.error("Could not archive variant."); }
    finally { setBusyId(null); }
  }
  const money = (value: number | string | null | undefined) => value == null
    ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-slate-500">Catalog management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Product variants</h1><p className="mt-2 text-sm text-slate-600">Manage size-level SKU, pricing, stock and Apliiq mapping.</p></div>
      <Button type="button" variant="outline" onClick={resetForm} disabled={!productId}><Plus className="mr-2 size-4" /> New variant</Button>
    </header>
    {initialError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{initialError}</div>}
    {products.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><p className="font-semibold">No products available</p><p className="mt-1 text-sm text-slate-500">Create a product before managing variants.</p></div> : <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="variant-product" className="mb-2 block text-sm font-semibold">Select product</label>
        <select id="variant-product" value={productId ?? ""} onChange={(event) => form.setValue("productId", event.target.value)} className="h-11 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-3 text-sm">
          {products.map((item) => <option key={item.id} value={item.id}>{item.name}{item.sku ? ` · ${item.sku}` : ""}</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">{assignedTemplateId ? `Sizes are limited to the template assigned to ${product?.subcategory?.name ?? "this subcategory"}.` : "No size template is assigned; active sizes from all templates are available."}</p>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-semibold">Variants</h2><p className="text-xs text-slate-500">{variants.length} record(s), including archived</p></div>{loading && <Loader2 className="size-4 animate-spin" />}</div>
        {loadError ? <div role="alert" className="p-5 text-sm text-rose-700">{loadError}</div> : loading ? <p className="p-8 text-center text-sm text-slate-500">Loading variants…</p> : variants.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No variants for this product yet.</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Size</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Color</th><th className="px-5 py-3">Regular / Sale</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Apliiq SKU</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{variants.map((item) => <tr key={item.id} className="hover:bg-slate-50/70">
              <td className="px-5 py-4 font-medium">{item.size?.label ?? "—"}<span className="block text-xs text-slate-500">{item.size?.template?.name ?? ""}</span></td>
              <td className="px-5 py-4 font-mono text-xs">{item.sku}</td>
              <td className="px-5 py-4"><span className="inline-flex items-center gap-2">{item.colorHex && <span className="size-4 rounded-full border" style={{ backgroundColor: item.colorHex }} />}{item.colorName ?? "—"}</span></td>
              <td className="px-5 py-4">{money(item.regularPrice)} / {money(item.salePrice)}</td><td className="px-5 py-4 tabular-nums">{item.stockQuantity}</td><td className="px-5 py-4 font-mono text-xs">{item.apliiqVariantSku ?? "—"}</td>
              <td className="px-5 py-4"><span className={item.isActive ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>{item.isActive ? "Active" : "Archived"}</span></td>
              <td className="px-5 py-4"><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="outline" onClick={() => editVariant(item)}><Pencil className="mr-1 size-3.5" /> Edit</Button>{item.isActive && <Button type="button" size="sm" variant="destructive" disabled={busyId === item.id} onClick={() => archive(item)}>{busyId === item.id ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="mr-1 size-3.5" />} Archive</Button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">{editingId ? "Edit variant" : "Create variant"}</h2><p className="text-xs text-slate-500">Every size has its own SKU, price and stock quantity.</p></div>{editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X className="mr-1 size-4" /> Cancel</Button>}</div>
        <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FormField control={form.control} name="sizeId" render={({ field }) => <FormItem><FormLabel>Size *</FormLabel><FormControl><select {...field} disabled={Boolean(editingId)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"><option value="">Choose size</option>{sizes.map((size) => <option key={size.id} value={size.id}>{size.label} · {size.templateName}</option>)}</select></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="sku" render={({ field }) => <FormItem><FormLabel>Store SKU *</FormLabel><FormControl><Input {...field} placeholder="TSHIRT-BLK-M" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="regularPrice" render={({ field }) => <FormItem><FormLabel>Regular price (USD) *</FormLabel><FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="29.99" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="salePrice" render={({ field }) => <FormItem><FormLabel>Sale price (USD)</FormLabel><FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="Optional" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="stockQuantity" render={({ field }) => <FormItem><FormLabel>Stock quantity *</FormLabel><FormControl><Input {...field} type="number" min="0" step="1" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="apliiqVariantSku" render={({ field }) => <FormItem><FormLabel>Apliiq variant SKU</FormLabel><FormControl><Input {...field} placeholder="Provider variant SKU" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="colorName" render={({ field }) => <FormItem><FormLabel>Color name</FormLabel><FormControl><Input {...field} placeholder="Black" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="colorHex" render={({ field }) => <FormItem><FormLabel>Color hex</FormLabel><FormControl><Input {...field} placeholder="#111827" /></FormControl><FormMessage /></FormItem>} />
            <FormField control={form.control} name="apliiqColorId" render={({ field }) => <FormItem><FormLabel>Apliiq color ID</FormLabel><FormControl><Input {...field} placeholder="Provider color ID" /></FormControl><FormMessage /></FormItem>} />
          </div>
          <FormField control={form.control} name="isActive" render={({ field }) => <FormItem className="flex items-center gap-3 space-y-0 rounded-xl border border-slate-200 p-3"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-slate-900" /></FormControl><div><FormLabel className="cursor-pointer">Active variant</FormLabel><p className="text-xs text-slate-500">Inactive variants cannot be selected for purchase.</p></div></FormItem>} />
          <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving || loading || !productId}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}{saving ? "Saving…" : editingId ? "Save changes" : "Create variant"}</Button>{editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}</div>
        </form></Form>
      </section>
    </>}
  </div>;
}
