import Link from "next/link";

export default function CustomerSecurityPage() {
  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">Account protection</p><h1 className="mt-1 text-3xl font-semibold">Security</h1><p className="mt-2 text-sm text-stone-500">Manage access to your customer account.</p></header>
    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Password</h2><p className="mt-2 text-sm leading-6 text-stone-500">The backend already supports authenticated password changes. Use the password reset flow if you cannot sign in.</p><div className="mt-4 flex flex-wrap gap-3"><Link href="/forgot-password" className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold hover:bg-stone-50">Reset password</Link></div></section>
    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Session safety</h2><p className="mt-2 text-sm leading-6 text-stone-500">Never share your password or verification codes. Sign out on shared devices. Admin and Super Admin accounts require an additional email OTP during login.</p></section>
  </div>;
}
