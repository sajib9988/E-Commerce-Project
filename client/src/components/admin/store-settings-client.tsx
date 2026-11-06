"use client";
import { useState } from "react";
import { updateStoreSetting } from "@/service/settings.service";
type Setting={key:string;value:unknown};
const defaults:Setting[]=[{key:"store.name",value:"My Store"},{key:"store.supportEmail",value:""},{key:"store.currency",value:"USD"},{key:"store.timezone",value:"America/New_York"},{key:"store.maintenanceMode",value:false}];
export function StoreSettingsClient({initial}:{initial:Setting[]}){
 const [items,setItems]=useState(()=>{const map=new Map(initial.map(x=>[x.key,x]));return defaults.map(x=>map.get(x.key)??x);});
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const set=(key:string,value:unknown)=>setItems(old=>old.map(x=>x.key===key?{...x,value}:x));
 const value=(key:string)=>items.find(x=>x.key===key)?.value;
 const save=async()=>{setBusy(true);setError("");setMessage("");for(const item of items){const result=await updateStoreSetting(item.key,item.value);if(result&&typeof result==="object"&&"success" in result&&(result as {success?:boolean}).success===false){setError(String((result as {message?:string}).message??"Save failed"));setBusy(false);return;}}setMessage("Store settings saved.");setBusy(false);};
 const cls="w-full rounded-lg border border-slate-300 p-2 text-sm";
 return <div className="space-y-6"><header><p className="text-sm text-slate-500">SUPER_ADMIN only</p><h1 className="mt-1 text-3xl font-bold">Store settings</h1><p className="mt-2 text-sm text-slate-600">Configuration is persisted in PostgreSQL.</p></header>
 {error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}{message&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
 <section className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
 <label className="space-y-1 text-sm"><span className="font-medium">Store name</span><input className={cls} value={String(value("store.name")??"")} onChange={e=>set("store.name",e.target.value)}/></label>
 <label className="space-y-1 text-sm"><span className="font-medium">Support email</span><input type="email" className={cls} value={String(value("store.supportEmail")??"")} onChange={e=>set("store.supportEmail",e.target.value)}/></label>
 <label className="space-y-1 text-sm"><span className="font-medium">Currency</span><select className={cls} value={String(value("store.currency")??"USD")} onChange={e=>set("store.currency",e.target.value)}><option>USD</option><option>CAD</option><option>EUR</option><option>GBP</option></select></label>
 <label className="space-y-1 text-sm"><span className="font-medium">Store timezone</span><select className={cls} value={String(value("store.timezone")??"America/New_York")} onChange={e=>set("store.timezone",e.target.value)}>{["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","UTC"].map(x=><option key={x}>{x}</option>)}</select></label>
 <label className="flex items-center gap-3 text-sm sm:col-span-2"><input type="checkbox" checked={value("store.maintenanceMode")===true} onChange={e=>set("store.maintenanceMode",e.target.checked)}/><span><b>Maintenance mode flag</b><small className="block text-slate-500">Stored only; storefront enforcement must be implemented separately.</small></span></label>
 </section><button disabled={busy} onClick={()=>void save()} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy?"Saving…":"Save settings"}</button></div>;
}