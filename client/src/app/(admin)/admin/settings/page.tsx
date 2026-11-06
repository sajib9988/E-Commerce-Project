import { redirect } from "next/navigation";
import { getMe } from "@/service/auth.service";
import { getStoreSettings } from "@/service/settings.service";
import { StoreSettingsClient } from "@/components/admin/store-settings-client";
type Setting={key:string;value:unknown};
export default async function AdminSettingsPage(){
 const session=await getMe();const current=session?.data??session;
 if(!current||current.role!=="SUPER_ADMIN")redirect("/admin?error=super_admin_required");
 const result=await getStoreSettings();const failed=!!result&&typeof result==="object"&&"success" in result&&(result as {success?:boolean}).success===false;
 const error=failed?String((result as {message?:string}).message??"Unable to load settings"):undefined;
 return <div className="space-y-4">{error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<StoreSettingsClient initial={Array.isArray(result)?result as Setting[]:[]}/></div>;
}