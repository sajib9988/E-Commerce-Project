"use server";

import { revalidatePath } from "next/cache";
import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";
const BASE_URL=process.env.NEXT_PUBLIC_BASE_URL;
type ApiError={success:false;message:string;statusCode?:number};
async function request<T>(path:string,options:RequestInit={}):Promise<T|ApiError>{if(!BASE_URL)return{success:false,message:"NEXT_PUBLIC_BASE_URL is not configured"};try{const response=await fetch(`${BASE_URL.replace(/\/+$/,"")}${path}`,{...options,headers:{...(await getAuthHeaders()),...Object.fromEntries(new Headers(options.headers).entries())},cache:"no-store"});const data=await safeJson<T|ApiError>(response);if(!response.ok)return{success:false,statusCode:response.status,message:data&&typeof data==="object"&&"message"in data?String(data.message):"Request failed"};return data as T;}catch{return{success:false,message:"Unable to connect to the server"};}}
export async function getNewsletterSubscribers(){return request<any[]>("/newsletter/admin/subscribers");}
export async function unsubscribeNewsletterSubscriber(id:string){const result=await request(`/newsletter/admin/subscribers/${encodeURIComponent(id)}/unsubscribe`,{method:"PATCH"});if(!(typeof result==="object"&&result!==null&&"success"in result&&(result as ApiError).success===false))revalidatePath("/admin/newsletter");return result;}
