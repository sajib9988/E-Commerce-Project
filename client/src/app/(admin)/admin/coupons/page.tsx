import { getCoupons } from "@/service/coupon.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminCouponsPage() {
  const result = await getCoupons();
  return <AdminResourcePage title="Coupons" description="Promotion codes, discount rules, usage limits and activation status from the Coupons API." result={result} columns={[
    { label: "Code", key: "code" }, { label: "Type", key: "type" }, { label: "Value", key: "value" },
    { label: "Usage", key: "usageCount" }, { label: "Usage limit", key: "usageLimit" },
    { label: "Active", key: "isActive" }, { label: "Expires", key: "expiresAt" },
  ]} emptyMessage="No coupons created yet." />;
}
