"use server";
import { cookies } from "next/headers";
const BASE_URL=process.env.NEXT_PUBLIC_BASE_URL;
export async function getAnalyticsOverview(params:{from?:string;to?:string}={}){
 if(!BASE_URL)return {success:false,message:"NEXT_PUBLIC_BASE_URL is not configured"};
 try{const q=new URLSearchParams();if(params.from)q.set("from",params.from);if(params.to)q.set("to",params.to);const token=(await cookies()).get("accessToken")?.value;
 const response=await fetch(`${BASE_URL.replace(/\/+$/,"")}/admin/analytics/overview${q.size?`?${q}`:""}`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:"no-store"});
 const data=await response.json().catch(()=>null);if(!response.ok)return {success:false,message:data?.message??`Request failed: ${response.status}`};return data;
 }catch{return {success:false,message:"Unable to connect to the server"};}
}