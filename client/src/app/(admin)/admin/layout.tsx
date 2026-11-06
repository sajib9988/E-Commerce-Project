import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getMe } from "@/service/auth.service";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin Dashboard | Store",
  description: "Store administration dashboard",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // getMe calls the backend, whose JwtAuthGuard verifies the signed access
  // token and reloads the current role from PostgreSQL (not from the cookie).
  const session = await getMe();
  const user = session?.data ?? session;

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?error=admin_required");
  }

  return <AdminShell>{children}</AdminShell>;
}
