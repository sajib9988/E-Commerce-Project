import { getMyCustomerProfile } from "@/service/customer.service";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";

export default async function CustomerProfilePage() {
  const result = await getMyCustomerProfile();
  const failed = !!result && typeof result === "object" && "success" in result && (result as any).success === false;
  const user = !failed ? ((result as any)?.data ?? result) as any : null;

  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">Personal information</p><h1 className="mt-1 text-3xl font-semibold">My profile</h1><p className="mt-2 text-sm text-stone-500">Update your display name and review your account verification details.</p></header>
    {failed ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{String((result as any).message ?? "Unable to load profile")}</p> :
      user ? <CustomerProfileForm profile={user} /> : <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Profile information is unavailable.</p>}
  </div>;
}
