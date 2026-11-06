import { getAdminUsers } from "@/service/admin.service";
import { AdminResourcePage } from "@/components/admin/admin-resource-page";

export default async function AdminUsersPage() {
  const result = await getAdminUsers({ page: 1, limit: 50 });
  return <AdminResourcePage title="Users & roles" description="User records and role assignments from the existing Users API. Backend role guards remain the source of authorization." result={result} columns={[
    { label: "Name", key: "name" }, { label: "Email", key: "email" }, { label: "Role", key: "role" },
    { label: "Created", key: "createdAt" }, { label: "Updated", key: "updatedAt" },
  ]} emptyMessage="No user records found." />;
}
