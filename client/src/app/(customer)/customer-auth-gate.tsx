import { redirect } from "next/navigation";
import { getMe } from "@/service/auth.service";
import { CustomerAuthRedirect } from "@/components/customer/customer-auth-redirect";

export default async function CustomerAuthGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // cookies() is accessed by getMe at request time inside the parent Suspense boundary.
  const session = await getMe();
  const user = session?.data ?? session;

  if (!user) return <CustomerAuthRedirect />;
  if (user.role !== "USER") redirect("/admin");

  return <>{children}</>;
}
