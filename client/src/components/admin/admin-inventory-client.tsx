"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Loader2, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createInventoryAdjustment, getInventoryAdjustments, type InventoryAdjustment } from "@/service/inventory.service";
type Product = { id: string; name: string; sku?: string | null; stockQuantity: number; variants?: Array<{ id: string; sku: string; stockQuantity: number; size?: { label: string }; colorName?: string | null }> };
type Values = { target: string; direction: "INCREASE" | "DECREASE"; quantity: string; reason: string };
const schema = z.object({ target: z.string().min(1, "Choose a stock item"), direction: z.enum(["INCREASE", "DECREASE"]), quantity: z.string().regex(/^[1-9]\d*$/, "Enter a positive whole number"), reason: z.string().trim().min(3, "A reason is required").max(500) });
const defaults: Values = { target: "", direction: "INCREASE", quantity: "1", reason: "" };
const isError = (v: unknown): v is { success: false; message: string } => typeof v === "object" && v !== null && "success" in v && v.success === false;
function getRows(v: unknown): InventoryAdjustment[] { return v && typeof v === "object" && Array.isArray((v as {items?: unknown}).items) ? (v as {items: InventoryAdjustment[]}).items : []; }
function itemName(item: InventoryAdjustment) { return item.variant ? `${item.variant.product?.name ?? "Product"} · ${item.variant.size?.label ?? ""} ${item.variant.colorName ?? ""} (${item.variant.sku})` : item.product ? `${item.product.name} (${item.product.sku ?? "No SKU"})` : "Unknown item"; }
export function AdminInventoryClient({ products, initialHistory, initialError }: { products: Product[]; initialHistory: unknown; initialError?: string }) {
 const [history,setHistory]=useState(getRows(initialHistory)),[saving,setSaving]=useState(false),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(initialError??"");
 const form=useForm<Values>({resolver:zodResolver(schema),defaultValues:defaults});
 const target=form.watch("target");
 const choices=useMemo(()=>products.flatMap(p=>[{value:`product:${p.id}`,label:`${p.name} · Product stock (${p.stockQuantity})`},...(p.variants??[]).map(v=>({value:`variant:${v.id}`,label:`${p.name} · ${v.size?.label??"Variant"} ${v.colorName??""} · ${v.sku} (${v.stockQuantity})`}))]),[products]);
 async function refresh(){setRefreshing(true);try{const r=await getInventoryAdjustments();if(isError(r))setError(r.message);else{setHistory(getRows(r));setError("");}}catch{setError("Could not refresh history.");}finally{setRefreshing(false);}}
 async function submit(v:Values){const [kind,id]=v.target.split(":");if(!id)return;setSaving(true);try{const r=await createInventoryAdjustment({...kind==="product"?{productId:id}:{variantId:id},direction:v.direction,quantity:Number(v.quantity),reason:v.reason.trim()});if(isError(r)){toast.error(r.message);return;}toast.success("Stock adjusted and audit history saved.");form.reset(defaults);await refresh();}catch{toast.error("Could not adjust stock.");}finally{setSaving(false);}}
 return <div className="space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Store operations</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Inventory</h1><p className="mt-2 text-sm text-slate-600">Adjust product or variant stock with a required reason and permanent audit history.</p></div><Button type="button" variant="outline" onClick={refresh} disabled={refreshing}>{refreshing?<Loader2 className="mr-2 size-4 animate-spin"/>:<RefreshCw className="mr-2 size-4"/>}Refresh history</Button></header>
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">New stock adjustment</h2><p className="mb-5 mt-1 text-xs text-slate-500">The stock update and audit record are committed in one database transaction. Negative stock is blocked.</p>
   {products.length===0?<p className="text-sm text-slate-500">No products available.</p>:<Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-4"><div className="grid gap-4 md:grid-cols-2">
    <FormField control={form.control} name="target" render={({field})=><FormItem><FormLabel>Product / variant *</FormLabel><FormControl><select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose stock item</option>{choices.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="direction" render={({field})=><FormItem><FormLabel>Adjustment *</FormLabel><FormControl><select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="INCREASE">Increase (+)</option><option value="DECREASE">Decrease (−)</option></select></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="quantity" render={({field})=><FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input {...field} type="number" min="1" step="1"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="reason" render={({field})=><FormItem><FormLabel>Reason *</FormLabel><FormControl><Textarea {...field} rows={3} placeholder="e.g. Received 25 units from supplier"/></FormControl><FormMessage/></FormItem>}/>
   </div><Button type="submit" disabled={saving||!target}>{saving?<Loader2 className="mr-2 size-4 animate-spin"/>:form.watch("direction")==="INCREASE"?<TrendingUp className="mr-2 size-4"/>:<TrendingDown className="mr-2 size-4"/>}{saving?"Saving…":"Apply adjustment"}</Button></form></Form>}
  </section>
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold">Adjustment history</h2><p className="text-xs text-slate-500">{history.length} recent adjustment(s)</p></div>
   {history.length===0?<p className="p-8 text-center text-sm text-slate-500">No manual adjustments recorded.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Stock item</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">Before → After</th><th className="px-5 py-3">Reason</th><th className="px-5 py-3">Adjusted by</th><th className="px-5 py-3">Date</th></tr></thead><tbody className="divide-y divide-slate-100">{history.map(i=><tr key={i.id}><td className="px-5 py-4 font-medium">{itemName(i)}</td><td className={i.quantityDelta>0?"px-5 py-4 font-semibold text-emerald-700":"px-5 py-4 font-semibold text-rose-700"}>{i.quantityDelta>0?"+":""}{i.quantityDelta}</td><td className="px-5 py-4 tabular-nums">{i.quantityBefore} → {i.quantityAfter}</td><td className="max-w-xs whitespace-normal px-5 py-4 text-slate-600">{i.reason}</td><td className="px-5 py-4">{i.actor?.name??"Admin"}</td><td className="px-5 py-4 text-slate-500">{new Date(i.createdAt).toLocaleString("en-US")}</td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}