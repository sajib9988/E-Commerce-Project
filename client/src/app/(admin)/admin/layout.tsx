import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin Dashboard | Store",
  description: "Store administration dashboard",
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
