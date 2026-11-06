"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createCoupon, disableCoupon, getCoupons, updateCoupon, type AdminCoupon, type CouponInput } from "@/service/coupon.service";
type Values={code:string;type:"PERCENT"|"FIXED"|"FREE_SHIPPING";value:string;minOrderAmount:string;maxDiscountAmount:string;startsAt:string;expiresAt:string;usageLimit:string;perUserLimit:string;userId:string;isActive:boolean};
const schema=z.object({
 code:z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_-]+$/,"Use letters, numbers, _ or -"),
 type:z.enum(["PERCENT","FIXED","FREE_SHIPPING"]),value:z.string().refine(v=>Number.isFinite(Number(v))&&Number(v)>=0,"Enter a valid value"),
 minOrderAmount:z.string().refine(v=>v===""||(Number.isFinite(Number(v))&&Number(v)>=0),"Enter a valid amount"),
 maxDiscountAmount:z.string().refine(v=>v===""||(Number.isFinite(Number(v))&&Number(v)>=0),"Enter a valid amount"),
 startsAt:z.string(),expiresAt:z.string(),usageLimit:z.string().refine(v=>v===""||/^[1-9]\d*$/.test(v),"Enter a positive whole number"),
 perUserLimit:z.string().regex(/^[1-9]\d*$/,"Enter a positive whole number"),userId:z.string().max(128),isActive:z.boolean()
}).superRefine((v,ctx)=>{
 if(v.type==="PERCENT"&&(Number(v.value)<=0||Number(v.value)>100))ctx.addIssue({code:"custom",path:["value"],message:"Percentage must be greater than 0 and at most 100"});
 if(v.type==="FREE_SHIPPING"&&Number(v.value)!==0)ctx.addIssue({code:"custom",path:["value"],message:"Free shipping uses value 0"});
 if(v.startsAt&&v.expiresAt&&new Date(v.expiresAt)<=new Date(v.startsAt))ctx.addIssue({code:"custom",path:["expiresAt"],message:"Expiry must be after start"});
});
const defaults:Values={code:"",type:"PERCENT",value:"10",minOrderAmount:"",maxDiscountAmount:"",startsAt:"",expiresAt:"",usageLimit:"",perUserLimit:"1",userId:"",isActive:true};
const isError=(v:unknown):v is {success:false;message:string}=>typeof v==="object"&&v!==null&&"success"in v&&v.success===false;
const dateInput=(v:string|null)=>v?new Date(v).toISOString().slice(0,16):"";
const money=(v:string|number|null)=>v==null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(v));
function discount(c:AdminCoupon){return c.type==="PERCENT"?`${c.value}% off`:c.type==="FREE_SHIPPING"?"Free shipping":money(c.value);}
export function AdminCouponsClient({initialCoupons,initialError}:{initialCoupons:AdminCoupon[];initialError?:string}){
 const [coupons,setCoupons]=useState(initialCoupons),[editingId,setEditingId]=useState<string|null>(null),[saving,setSaving]=useState(false),[busyId,setBusyId]=useState<string|null>(null);
 const form=useForm<Values>({resolver:zodResolver(schema),defaultValues:defaults}),type=useWatch({control:form.control,name:"type"});
 function reset(){setEditingId(null);form.reset(defaults);}
 function edit(c:AdminCoupon){setEditingId(c.id);form.reset({code:c.code,type:c.type,value:c.value,minOrderAmount:c.minOrderAmount??"",maxDiscountAmount:c.maxDiscountAmount??"",startsAt:dateInput(c.startsAt),expiresAt:dateInput(c.expiresAt),usageLimit:c.usageLimit==null?"":String(c.usageLimit),perUserLimit:String(c.perUserLimit),userId:c.userId??"",isActive:c.isActive});}
 async function reload(){const r=await getCoupons();if(isError(r)){toast.error(r.message);return;}setCoupons(r);}
 async function submit(v:Values){setSaving(true);const data:CouponInput={code:v.code.trim().toUpperCase(),type:v.type,value:v.type==="FREE_SHIPPING"?0:Number(v.value),minOrderAmount:v.minOrderAmount===""?null:Number(v.minOrderAmount),maxDiscountAmount:v.maxDiscountAmount===""?null:Number(v.maxDiscountAmount),startsAt:v.startsAt?new Date(v.startsAt).toISOString():null,expiresAt:v.expiresAt?new Date(v.expiresAt).toISOString():null,usageLimit:v.usageLimit===""?null:Number(v.usageLimit),perUserLimit:Number(v.perUserLimit),userId:v.userId.trim()||null,isActive:v.isActive};
 try{const r=editingId?await updateCoupon(editingId,data):await createCoupon(data);if(isError(r)){toast.error(r.message);return;}toast.success(editingId?"Coupon updated.":"Coupon created.");reset();await reload();}catch{toast.error("Could not save coupon.");}finally{setSaving(false);}}
 async function disable(c:AdminCoupon){if(!window.confirm(`Disable coupon "${c.code}"? Existing redemption records will be kept.`))return;setBusyId(c.id);try{const r=await disableCoupon(c.id);if(isError(r)){toast.error(r.message);return;}toast.success("Coupon disabled.");await reload();}catch{toast.error("Could not disable coupon.");}finally{setBusyId(null);}}
 return <div className="space-y-6">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-slate-500">Store management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Coupons</h1><p className="mt-2 text-sm text-slate-600">Create and manage discount rules, usage limits and activation windows.</p></div><Button type="button" variant="outline" onClick={reset}><Plus className="mr-2 size-4"/>New coupon</Button></header>
  {initialError&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{initialError}</div>}
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">Promotion codes</h2><p className="text-xs text-slate-500">{coupons.length} coupon(s)</p></div>
   {coupons.length===0?<p className="p-8 text-center text-sm text-slate-500">No coupons created yet.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Code</th><th className="px-5 py-3">Discount</th><th className="px-5 py-3">Usage</th><th className="px-5 py-3">Per user</th><th className="px-5 py-3">Validity</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y">{coupons.map(c=><tr key={c.id}><td className="px-5 py-4 font-mono font-semibold">{c.code}</td><td className="px-5 py-4">{discount(c)}</td><td className="px-5 py-4">{c.usageCount} / {c.usageLimit??"∞"}</td><td className="px-5 py-4">{c.perUserLimit}</td><td className="px-5 py-4 text-xs text-slate-500">{c.startsAt?new Date(c.startsAt).toLocaleDateString():"Now"} – {c.expiresAt?new Date(c.expiresAt).toLocaleDateString():"No expiry"}</td><td className="px-5 py-4">{c.isActive?"Active":"Disabled"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button size="sm" type="button" variant="outline" onClick={()=>edit(c)}><Pencil className="mr-1 size-3.5"/>Edit</Button>{c.isActive&&<Button size="sm" type="button" variant="destructive" disabled={busyId===c.id} onClick={()=>disable(c)}>{busyId===c.id?<Loader2 className="size-3.5 animate-spin"/>:<Trash2 className="mr-1 size-3.5"/>}Disable</Button>}</div></td></tr>)}</tbody></table></div>}
  </section>
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">{editingId?"Edit coupon":"Create coupon"}</h2><p className="text-xs text-slate-500">The backend validates every coupon rule before saving.</p></div>{editingId&&<Button type="button" size="sm" variant="ghost" onClick={reset}><X className="mr-1 size-4"/>Cancel</Button>}</div>
   <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <FormField control={form.control} name="code" render={({field})=><FormItem><FormLabel>Coupon code *</FormLabel><FormControl><Input {...field} placeholder="WELCOME10"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="type" render={({field})=><FormItem><FormLabel>Discount type *</FormLabel><FormControl><select {...field} onChange={e=>{field.onChange(e);if(e.target.value==="FREE_SHIPPING")form.setValue("value","0");}} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="PERCENT">Percentage (%)</option><option value="FIXED">Fixed amount (USD)</option><option value="FREE_SHIPPING">Free shipping</option></select></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="value" render={({field})=><FormItem><FormLabel>{type==="PERCENT"?"Discount percentage *":"Discount value (USD) *"}</FormLabel><FormControl><Input {...field} type="number" min="0" step="0.01" disabled={type==="FREE_SHIPPING"}/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="minOrderAmount" render={({field})=><FormItem><FormLabel>Minimum order (USD)</FormLabel><FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="Optional"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="maxDiscountAmount" render={({field})=><FormItem><FormLabel>Maximum discount (USD)</FormLabel><FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="Optional"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="usageLimit" render={({field})=><FormItem><FormLabel>Total usage limit</FormLabel><FormControl><Input {...field} type="number" min="1" step="1" placeholder="Unlimited"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="perUserLimit" render={({field})=><FormItem><FormLabel>Per-customer limit *</FormLabel><FormControl><Input {...field} type="number" min="1" step="1"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="startsAt" render={({field})=><FormItem><FormLabel>Starts at</FormLabel><FormControl><Input {...field} type="datetime-local"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="expiresAt" render={({field})=><FormItem><FormLabel>Expires at</FormLabel><FormControl><Input {...field} type="datetime-local"/></FormControl><FormMessage/></FormItem>}/>
    <FormField control={form.control} name="userId" render={({field})=><FormItem><FormLabel>Assigned customer ID</FormLabel><FormControl><Input {...field} placeholder="Blank = all customers"/></FormControl><FormMessage/></FormItem>}/>
   </div>
   <FormField control={form.control} name="isActive" render={({field})=><FormItem className="flex items-center gap-3 space-y-0 rounded-xl border p-3"><FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} className="size-4 accent-slate-900"/></FormControl><div><FormLabel className="cursor-pointer">Active coupon</FormLabel><p className="text-xs text-slate-500">Inactive coupons cannot be applied at checkout.</p></div></FormItem>}/>
   <div className="flex gap-3"><Button type="submit" disabled={saving}>{saving?<Loader2 className="mr-2 size-4 animate-spin"/>:<Save className="mr-2 size-4"/>}{saving?"Saving…":editingId?"Save changes":"Create coupon"}</Button>{editingId&&<Button type="button" variant="outline" onClick={reset}>Cancel</Button>}</div>
   </form></Form>
  </section>
 </div>;
}