"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, ChevronDown, ChevronRight, FolderPlus, Pencil, Plus, Save, Tags, Trash2, X } from "lucide-react";
import { createCategory, createSubcategory, deleteCategory, deleteSubcategory, updateCategory, updateSubcategory } from "@/service/admin.service";

type Subcategory = { id: string; name: string; slug: string; description?: string | null; sortOrder: number; isActive: boolean };
type Category = { id: string; name: string; slug: string; description?: string | null; sortOrder: number; isActive: boolean; subcategories?: Subcategory[]; _count?: { products?: number; subcategories?: number } };
type FormState = { name: string; slug: string; description: string; sortOrder: string; isActive: boolean };
const empty: FormState = { name: "", slug: "", description: "", sortOrder: "0", isActive: true };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isError = (v: unknown): v is { success: false; message: string } => typeof v === "object" && v !== null && "success" in v && v.success === false;

function FormFields({ value, onChange, prefix }: { value: FormState; onChange: (value: FormState) => void; prefix: string }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <label className="space-y-1 text-sm"><span className="font-medium text-slate-700">Name *</span><input required maxLength={120} value={value.name} onChange={e => onChange({ ...value, name: e.target.value, slug: value.slug || slugify(e.target.value) })} className="h-10 w-full rounded-lg border px-3" placeholder={prefix === "Category" ? "Apparel" : "T-shirts"} /></label>
    <label className="space-y-1 text-sm"><span className="font-medium text-slate-700">URL slug *</span><input required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={value.slug} onChange={e => onChange({ ...value, slug: e.target.value })} className="h-10 w-full rounded-lg border px-3" placeholder="apparel" /></label>
    <label className="space-y-1 text-sm"><span className="font-medium text-slate-700">Sort order</span><input type="number" min="0" step="1" value={value.sortOrder} onChange={e => onChange({ ...value, sortOrder: e.target.value })} className="h-10 w-full rounded-lg border px-3" /></label>
    <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={value.isActive} onChange={e => onChange({ ...value, isActive: e.target.checked })} /> Active</label>
    <label className="space-y-1 text-sm md:col-span-2 xl:col-span-4"><span className="font-medium text-slate-700">Description</span><textarea maxLength={1000} rows={2} value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} className="w-full rounded-lg border px-3 py-2" /></label>
  </div>;
}

export function AdminCategoriesClient({ initialCategories, initialError }: { initialCategories: Record<string, unknown>[]; initialError?: string }) {
  const router = useRouter();
  const categories = useMemo(() => initialCategories as unknown as Category[], [initialCategories]);
  const [form, setForm] = useState<FormState>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subParent, setSubParent] = useState<string | null>(null);
  const [subEditing, setSubEditing] = useState<string | null>(null);
  const [subForm, setSubForm] = useState<FormState>(empty);
  const [error, setError] = useState(initialError ?? "");
  const activeCount = categories.filter(c => c.isActive).length;

  const submitCategory = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    const payload = { name: form.name.trim(), slug: form.slug.trim().toLowerCase(), description: form.description.trim() || null, sortOrder: Number(form.sortOrder), isActive: form.isActive };
    if (!payload.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug) || !Number.isInteger(payload.sortOrder) || payload.sortOrder < 0) { setError("Enter a valid name, URL slug and non-negative integer sort order."); return; }
    setBusy(true);
    try { const result = editing ? await updateCategory(editing, payload) : await createCategory(payload); if (isError(result)) { setError(result.message); return; } setForm(empty); setEditing(null); router.refresh(); }
    catch { setError("Unable to save category."); } finally { setBusy(false); }
  };
  const submitSubcategory = async (e: FormEvent) => {
    e.preventDefault(); if (!subParent) return; setError("");
    const payload = { name: subForm.name.trim(), slug: subForm.slug.trim().toLowerCase(), description: subForm.description.trim() || null, sortOrder: Number(subForm.sortOrder), isActive: subForm.isActive };
    if (!payload.name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.slug) || !Number.isInteger(payload.sortOrder) || payload.sortOrder < 0) { setError("Enter a valid subcategory name, URL slug and sort order."); return; }
    setBusy(true);
    try { const result = subEditing ? await updateSubcategory(subEditing, payload) : await createSubcategory(subParent, payload); if (isError(result)) { setError(result.message); return; } setSubParent(null); setSubEditing(null); setSubForm(empty); router.refresh(); }
    catch { setError("Unable to save subcategory."); } finally { setBusy(false); }
  };
  const toggleCategory = async (c: Category) => { const r = await updateCategory(c.id, { isActive: !c.isActive }); if (isError(r)) setError(r.message); else router.refresh(); };
  const toggleSub = async (s: Subcategory) => { const r = await updateSubcategory(s.id, { isActive: !s.isActive }); if (isError(r)) setError(r.message); else router.refresh(); };
  const removeCategory = async (c: Category) => { if (!window.confirm("Delete " + c.name + "? Categories with products or subcategories cannot be deleted; deactivate instead.")) return; const r = await deleteCategory(c.id); if (isError(r)) setError(r.message); else router.refresh(); };
  const removeSub = async (s: Subcategory) => { if (!window.confirm("Delete subcategory " + s.name + "?")) return; const r = await deleteSubcategory(s.id); if (isError(r)) setError(r.message); else router.refresh(); };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Catalog management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Categories</h1><p className="mt-2 text-sm text-slate-600">Create and manage product categories and subcategories.</p></div><div className="flex gap-2 text-sm"><span className="rounded-xl border bg-white px-3 py-2">{categories.length} total</span><span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">{activeCount} active</span></div></header>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">{editing ? "Edit category" : "Create category"}</h2><p className="mt-1 text-xs text-slate-500">Active categories appear in the product form.</p></div>{editing && <button type="button" onClick={() => { setEditing(null); setForm(empty); }} className="text-sm text-slate-500">Cancel</button>}</div>
      <form onSubmit={submitCategory} className="space-y-4"><FormFields value={form} onChange={setForm} prefix="Category" /><button disabled={busy} className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="mr-2 size-4" />{editing ? "Save category" : "Create category"}</button></form>
    </section>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">Category list</h2></div>
      {categories.length === 0 ? <div className="p-10 text-center"><Tags className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-medium">No categories yet</p><p className="mt-1 text-sm text-slate-500">Create your first category above.</p></div> : <div className="divide-y">{categories.map(c => <article key={c.id} className="p-4"><div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="rounded p-1">{expanded === c.id ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>{c.name}</strong><span className={c.isActive ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500"}>{c.isActive ? "Active" : "Inactive"}</span></div><p className="text-xs text-slate-500">{c.slug} · {c.subcategories?.length ?? 0} subcategories · {c._count?.products ?? 0} products</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setEditing(c.id); setForm({ name:c.name, slug:c.slug, description:c.description ?? "", sortOrder:String(c.sortOrder ?? 0), isActive:c.isActive }); }} className="rounded-lg border px-3 py-2 text-xs"><Pencil className="mr-1 inline size-3"/>Edit</button><button type="button" onClick={() => toggleCategory(c)} className="rounded-lg border px-3 py-2 text-xs">{c.isActive ? <Archive className="mr-1 inline size-3"/> : <Check className="mr-1 inline size-3" />}{c.isActive ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => removeCategory(c)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs text-rose-600"><Trash2 className="mr-1 inline size-3"/>Delete</button><button type="button" onClick={() => { setSubParent(c.id); setSubEditing(null); setSubForm(empty); setExpanded(c.id); }} className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white"><FolderPlus className="mr-1 inline size-3"/>Subcategory</button></div></div>
        {expanded === c.id && <div className="ml-8 mt-4 space-y-3 border-l pl-4">{(c.subcategories ?? []).map(s => <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3"><div className="flex-1"><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-slate-500">{s.slug} · {s.isActive ? "Active" : "Inactive"}</p></div><button type="button" onClick={() => { setSubParent(c.id); setSubEditing(s.id); setSubForm({ name:s.name, slug:s.slug, description:s.description ?? "", sortOrder:String(s.sortOrder ?? 0), isActive:s.isActive }); }} className="text-xs text-slate-600">Edit</button><button type="button" onClick={() => toggleSub(s)} className="text-xs text-slate-600">{s.isActive ? "Deactivate" : "Activate"}</button><button type="button" onClick={() => removeSub(s)} className="text-xs text-rose-600">Delete</button></div>)}
          {subParent === c.id && <form onSubmit={submitSubcategory} className="space-y-3 rounded-xl border bg-slate-50 p-4"><div className="flex justify-between"><strong className="text-sm">{subEditing ? "Edit subcategory" : "New subcategory"}</strong><button type="button" onClick={() => { setSubParent(null); setSubEditing(null); }}><X size={16}/></button></div><FormFields value={subForm} onChange={setSubForm} prefix="Subcategory"/><button disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white"><Plus className="mr-1 inline size-4"/>{subEditing ? "Save subcategory" : "Create subcategory"}</button></form>}
        </div>}
      </article>)}</div>}
    </section>
  </div>;
}
