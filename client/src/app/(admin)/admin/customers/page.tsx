import { getAdminUsers } from "@/service/admin.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminCustomersPage() {
  const result = await getAdminUsers({ page: 1, limit: 50 });
  return <AdminResourcePage title="Customers & users" description="User records returned by the existing Users API. The current backend does not expose a separate customer-only listing endpoint." result={result} columns={[
    { label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Role", key: "role" },
    { label: "Status", key: "status" }, { label: "Joined", key: "createdAt" },
  ]} emptyMessage="No user records found." />;
}
