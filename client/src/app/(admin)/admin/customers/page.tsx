import { AdminCustomersClient } from "@/components/admin/admin-customers-client";
import { getAdminCustomers } from "@/service/admin.service";

export default async function AdminCustomersPage() {
  const result = await getAdminCustomers({ page: 1, limit: 50 });
  return <AdminCustomersClient initialResult={result} />;
}
