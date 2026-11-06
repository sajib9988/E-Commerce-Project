import { AdminCouponsClient } from "@/components/admin/admin-coupons-client";
import { getCoupons, type AdminCoupon } from "@/service/coupon.service";
function isApiError(v:unknown):v is {success:false;message:string}{return typeof v==="object"&&v!==null&&"success"in v&&v.success===false;}
export default async function AdminCouponsPage(){
 const result=await getCoupons();
 return <AdminCouponsClient initialCoupons={isApiError(result)?[]:result as AdminCoupon[]} initialError={isApiError(result)?result.message:undefined}/>;
}