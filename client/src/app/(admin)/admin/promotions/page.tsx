import { getPromotions } from "@/service/promotion.service";
import { AdminPromotionsClient } from "@/components/admin/admin-promotions-client";
export default async function PromotionsPage(){const result=await getPromotions();const failed=typeof result==="object"&&result!==null&&"success"in result&&result.success===false;return <AdminPromotionsClient initialPromotions={failed?[]:result as any[]} initialError={failed?result.message:undefined}/>;}
