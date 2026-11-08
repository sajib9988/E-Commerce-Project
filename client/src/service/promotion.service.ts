"use server";

import { revalidatePath } from "next/cache";
import { getAuthHeaders } from "@/lib/api/get-auth-headers";
import { safeJson } from "@/lib/api/safe-json";

const BASE_URL=process.env.NEXT_PUBLIC_BASE_URL;
type ApiError={success:false;message:string;statusCode?:number};
export type PromotionInput={name:string;type:"AUTOMATIC"|"POPUP"|"VOLUME"|"FREE_SHIPPING";discountType?:"PERCENTAGE"|"FIXED";discountValue?:number;couponRequired?:boolean;isSignupOffer?:boolean;title?:string;description?:string;startsAt:string;endsAt:string;isActive?:boolean};
async function request<T>(path:string,options:RequestInit={}):Promise<T|ApiError>{
 if(!BASE_URL)return {success:false,message:"NEXT_PUBLIC_BASE_URL is not configured"};
 try{const response=await fetch(`${BASE_URL.replace(/\/+$/,"")}${path}`,{...options,headers:{...(await getAuthHeaders()),...Object.fromEntries(new Headers(options.headers).entries())},cache:"no-store"});const data=await safeJson<T|ApiError>(response);if(!response.ok)return {success:false,statusCode:response.status,message:data&&typeof data==="object"&&"message"in data?String(data.message):"Request failed"};return data as T;}catch{return {success:false,message:"Unable to connect to the server"};}
}
const failed=(v:unknown):v is ApiError=>typeof v==="object"&&v!==null&&"success"in v&&(v as ApiError).success===false;
export async function getPromotions(){return request<any[]>("/promotions");}
export async function createPromotion(data:PromotionInput){const r=await request("/promotions",{method:"POST",body:JSON.stringify(data)});if(!failed(r))revalidatePath("/admin/promotions");return r;}
export async function updatePromotion(id:string,data:Partial<PromotionInput>){const r=await request(`/promotions/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(data)});if(!failed(r))revalidatePath("/admin/promotions");return r;}
export async function disablePromotion(id:string){const r=await request(`/promotions/${encodeURIComponent(id)}`,{method:"DELETE"});if(!failed(r))revalidatePath("/admin/promotions");return r;}
