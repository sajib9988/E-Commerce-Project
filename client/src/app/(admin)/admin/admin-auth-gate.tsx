import { redirect } from "next/navigation";
import { getMe } from "@/service/auth.service";

export default async function AdminAuthGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // This request-time authentication check must stay inside the Layout's Suspense boundary.
  const session = await getMe();
  const user = session?.data ?? session;

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?error=admin_required");
  }

  return <>{children}</>;
}
