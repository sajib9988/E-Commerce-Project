import { AdminInventoryClient } from "@/components/admin/admin-inventory-client";
import { getAdminProducts } from "@/service/product.service";
import { getInventoryAdjustments } from "@/service/inventory.service";
function isApiError(v:unknown):v is {success:false;message:string}{return typeof v==="object"&&v!==null&&"success"in v&&v.success===false;}
type Product={id:string;name:string;sku?:string|null;stockQuantity:number;variants?:Array<{id:string;sku:string;stockQuantity:number;size?:{label:string};colorName?:string|null}>};
export default async function AdminInventoryPage(){
 const [productsResult,historyResult]=await Promise.all([getAdminProducts({page:1,limit:100,sortBy:"name",sortOrder:"asc"}),getInventoryAdjustments(1,50)]);
 const products=productsResult&&typeof productsResult==="object"&&Array.isArray((productsResult as {items?:unknown}).items)?(productsResult as {items:Product[]}).items:[];
 const error=isApiError(productsResult)?productsResult.message:isApiError(historyResult)?historyResult.message:undefined;
 return <AdminInventoryClient products={products} initialHistory={historyResult} initialError={error}/>;
}