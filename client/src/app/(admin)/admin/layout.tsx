import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import AdminAuthGate from "./admin-auth-gate";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin Dashboard | Store",
  description: "Store administration dashboard",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading admin...
        </div>
      }
    >
      <AdminAuthGate>
        <AdminShell>{children}</AdminShell>
      </AdminAuthGate>
    </Suspense>
  );
}
