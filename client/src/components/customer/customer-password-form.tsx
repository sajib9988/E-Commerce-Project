"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/service/auth.service";

export function CustomerPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    startTransition(async () => {
      const result = await changePassword({ currentPassword, newPassword });
      if (result && typeof result === "object" && "success" in result && result.success === false) {
        setError(String(result.message ?? "Could not change password."));
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(String((result as { message?: string })?.message ?? "Password changed successfully."));
    });
  }

  const fieldClass = "w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-stone-500";

  return (
    <form onSubmit={submit} className="mt-4 max-w-xl space-y-4">
      <label className="grid gap-1.5 text-sm font-medium">Current password
        <input className={fieldClass} type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">New password
        <input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">Confirm new password
        <input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
      </label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
      <button type="submit" disabled={pending || !currentPassword || !newPassword || !confirmPassword} className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Updating password…" : "Change password"}
      </button>
    </form>
  );
}
