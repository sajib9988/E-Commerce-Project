"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";

type ApiError={success:false;message:string;statusCode?:number};
export type PromotionInput={name:string;type:"AUTOMATIC"|"POPUP"|"VOLUME"|"FREE_SHIPPING";discountType?:"PERCENTAGE"|"FIXED";discountValue?:number;couponRequired?:boolean;isSignupOffer?:boolean;title?:string;description?:string;startsAt:string;endsAt:string;isActive?:boolean};
async function request<T>(path:string,options:RequestInit={}):Promise<T|ApiError>{
  return apiRequest<T>(path, options, { context: "promotion request" });
}
const failed=(v:unknown):v is ApiError=>typeof v==="object"&&v!==null&&"success"in v&&(v as ApiError).success===false;
export async function getPromotions(){return request<any[]>("/promotions");}
export async function createPromotion(data:PromotionInput){const r=await request("/promotions",{method:"POST",body:JSON.stringify(data)});if(!failed(r))revalidatePath("/admin/promotions");return r;}
export async function updatePromotion(id:string,data:Partial<PromotionInput>){const r=await request(`/promotions/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(data)});if(!failed(r))revalidatePath("/admin/promotions");return r;}
export async function disablePromotion(id:string){const r=await request(`/promotions/${encodeURIComponent(id)}`,{method:"DELETE"});if(!failed(r))revalidatePath("/admin/promotions");return r;}
