import { redirect } from "next/navigation";
import { getMe } from "@/service/auth.service";
import { getAdminUsers } from "@/service/admin.service";
import { AdminUsersClient } from "@/components/admin/admin-users-client";
type User = { id: string; name: string; email: string; role: "USER"|"ADMIN"|"SUPER_ADMIN" };
export default async function AdminUsersPage() {
  const session=await getMe(); const current=session?.data??session;
  if(!current||current.role!=="SUPER_ADMIN") redirect("/admin?error=super_admin_required");
  const result=await getAdminUsers({page:1,limit:100});
  const failed=!!result&&typeof result==="object"&&"success" in result&&(result as {success?:boolean}).success===false;
  const data=result&&typeof result==="object"&&"data" in result&&Array.isArray(result.data)?result.data as User[]:[];
  const error=failed?String((result as {message?:string}).message??"Unable to load users"):undefined;
  return <AdminUsersClient initialUsers={data} initialError={error}/>;
}