import Link from "next/link";
import { CustomerPasswordForm } from "@/components/customer/customer-password-form";

export default function CustomerSecurityPage() {
  return <div className="space-y-6">
    <header><p className="text-sm text-stone-500">Account protection</p><h1 className="mt-1 text-3xl font-semibold">Security</h1><p className="mt-2 text-sm text-stone-500">Update your password and protect your customer account.</p></header>
    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Change password</h2><p className="mt-2 text-sm leading-6 text-stone-500">Confirm your current password before saving a new one. Use at least 8 characters.</p><CustomerPasswordForm /></section>
    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Forgot your current password?</h2><p className="mt-2 text-sm leading-6 text-stone-500">Use the secure email verification flow to reset it.</p><div className="mt-4"><Link href="/forgot-password" className="inline-flex rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold hover:bg-stone-50">Reset password</Link></div></section>
    <section className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">Session safety</h2><p className="mt-2 text-sm leading-6 text-stone-500">Never share your password or verification codes. Sign out on shared devices. Admin and Super Admin accounts require an additional email OTP during login.</p></section>
  </div>;
}
