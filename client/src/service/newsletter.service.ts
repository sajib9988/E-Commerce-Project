"use server";

import { apiRequest } from "@/lib/api/server-request";

import { revalidatePath } from "next/cache";
type ApiError={success:false;message:string;statusCode?:number};
async function request<T>(path:string,options:RequestInit={}):Promise<T|ApiError>{
  return apiRequest<T>(path, options, { context: "Newsletter request" });
}
export async function getNewsletterSubscribers(){return request<any[]>("/newsletter/admin/subscribers");}
export async function unsubscribeNewsletterSubscriber(id:string){const result=await request(`/newsletter/admin/subscribers/${encodeURIComponent(id)}/unsubscribe`,{method:"PATCH"});if(!(typeof result==="object"&&result!==null&&"success"in result&&(result as ApiError).success===false))revalidatePath("/admin/newsletter");return result;}
