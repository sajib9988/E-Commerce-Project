"use client";

import { useState, useTransition } from "react";
import { updateMyCustomerProfile } from "@/service/profile.service";

type Profile = { id: string; name: string; email: string; role: string; emailVerified: boolean };

export function CustomerProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = name.trim();
    if (value.length < 2 || value.length > 80) {
      setError("Name must contain between 2 and 80 characters.");
      return;
    }
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await updateMyCustomerProfile(value);
      if (result && typeof result === "object" && "success" in result && result.success === false) {
        setError(String(result.message ?? "Could not update profile."));
        return;
      }
      setMessage("Profile updated successfully.");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">Full name
        <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required className="h-11 rounded-lg border border-stone-300 px-3 font-normal outline-none focus:border-stone-500" />
      </label>
      <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Email address</p><p className="mt-2 break-words text-sm font-medium">{profile.email}</p><p className="mt-1 text-xs text-stone-500">Email changes require a separate verification flow.</p></div>
      <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Account role</p><p className="mt-2 text-sm font-medium">{profile.role}</p></div>
      <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Email verification</p><p className="mt-2 text-sm font-medium">{profile.emailVerified ? "Verified" : "Not verified"}</p></div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 sm:col-span-2">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:col-span-2">{message}</p>}
      <div className="sm:col-span-2"><button type="submit" disabled={pending || name.trim() === profile.name} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Saving…" : "Save profile"}</button></div>
    </form>
  );
}
