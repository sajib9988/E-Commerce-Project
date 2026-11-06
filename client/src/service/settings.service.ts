"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
const BASE_URL=process.env.NEXT_PUBLIC_BASE_URL;
async function request(path:string,options:RequestInit={}) {
  if(!BASE_URL)return {success:false,message:"NEXT_PUBLIC_BASE_URL is not configured"};
  try { const token=(await cookies()).get("accessToken")?.value;
    const response=await fetch(`${BASE_URL.replace(/\/+$/,"")}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},cache:"no-store"});
    const data=await response.json().catch(()=>null);
    if(!response.ok)return {success:false,message:data?.message??`Request failed: ${response.status}`};return data;
  }catch{return {success:false,message:"Unable to connect to the server"};}
}
export async function getStoreSettings(){return request("/admin/settings");}
export async function updateStoreSetting(key:string,value:unknown){
  const result=await request("/admin/settings",{method:"PUT",body:JSON.stringify({key,value})});
  if(!(result&&typeof result==="object"&&"success" in result&&(result as {success?:boolean}).success===false))revalidatePath("/admin/settings");
  return result;
}