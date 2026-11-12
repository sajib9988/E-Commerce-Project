"use server";

import { apiRequest } from "@/lib/api/server-request";
import { revalidatePath } from "next/cache";
async function request(path:string,options:RequestInit={}) {
  return apiRequest(path, options, { context: "settings request" });
}
export async function getStoreSettings(){return request("/admin/settings");}
export async function updateStoreSetting(key:string,value:unknown){
  const result=await request("/admin/settings",{method:"PUT",body:JSON.stringify({key,value})});
  if(!(result&&typeof result==="object"&&"success" in result&&(result as {success?:boolean}).success===false))revalidatePath("/admin/settings");
  return result;
}