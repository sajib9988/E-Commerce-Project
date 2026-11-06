import { getMyCustomerProfile } from "@/service/customer.service";

export default async function CustomerProfilePage() {
  const result = await getMyCustomerProfile();
  const failed = !!result && typeof result === "object" && "success" in result && (result as any).success === false;
  const user = !failed ? ((result as any)?.data ?? result) as any : null;
  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">Personal information</p><h1 className="mt-1 text-3xl font-semibold">My profile</h1><p className="mt-2 text-sm text-stone-500">Your account details currently available from the existing authentication API.</p></header>
    {failed ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{String((result as any).message ?? "Unable to load profile")}</p> :
      <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
        {[["Full name",user?.name],["Email address",user?.email],["Account role",user?.role],["Email verified",user?.emailVerified ? "Verified" : "Not verified"]].map(([label,value]) => <div key={label} className="rounded-xl bg-stone-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</p><p className="mt-2 break-words text-sm font-medium">{String(value ?? "—")}</p></div>)}
        <p className="text-xs leading-5 text-stone-400 sm:col-span-2">Profile editing and saved addresses are not exposed by the current backend API, so this page is intentionally read-only. We can add those features later with your approval.</p>
      </section>}
  </div>;
}
