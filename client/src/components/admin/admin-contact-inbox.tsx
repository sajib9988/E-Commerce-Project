"use client";

import { useMemo, useState, useTransition } from "react";
import {
  updateAdminContactStatus,
  type ContactStatus,
  type ContactSubmission,
} from "@/service/contact.service";

type Filter = "ALL" | ContactStatus;
type ApiError = { success: false; message?: string };

function isError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && (value as ApiError).success === false;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function AdminContactInbox({
  initialSubmissions,
  initialError,
}: {
  initialSubmissions: ContactSubmission[];
  initialError?: string;
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [filter, setFilter] = useState<Filter>("NEW");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => ({
    ALL: submissions.length,
    NEW: submissions.filter((item) => item.status === "NEW").length,
    READ: submissions.filter((item) => item.status === "READ").length,
    RESOLVED: submissions.filter((item) => item.status === "RESOLVED").length,
  }), [submissions]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return submissions.filter((item) => {
      const matchesStatus = filter === "ALL" || item.status === filter;
      const matchesSearch = !term || [item.name, item.email, item.subject, item.message]
        .some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [filter, query, submissions]);

  function changeStatus(item: ContactSubmission, status: ContactStatus) {
    setError("");
    setNotice("");
    startTransition(async () => {
      const result = await updateAdminContactStatus(item.id, status);
      if (isError(result)) {
        setError(result.message || "Could not update this inquiry.");
        return;
      }
      setSubmissions((current) => current.map((entry) => entry.id === item.id ? result as ContactSubmission : entry));
      setNotice(`Inquiry marked as ${status.toLowerCase()}.`);
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Customer messages</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Contact inbox</h1>
          <p className="mt-2 text-sm text-slate-600">Review customer inquiries and keep their status up to date.</p>
        </div>
        <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          {submissions.length} latest messages
        </span>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {(["NEW", "READ", "RESOLVED", "ALL"] as Filter[]).map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)}
            className={"rounded-xl border p-4 text-left transition " + (filter === status ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400")}>
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-70">{status === "ALL" ? "All messages" : status}</span>
            <span className="mt-2 block text-2xl font-bold">{counts[status]}</span>
          </button>
        ))}
      </section>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div><h2 className="font-semibold text-slate-950">Inbox messages</h2><p className="mt-1 text-xs text-slate-500">Showing the latest 200 submissions.</p></div>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or message..."
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 sm:w-72" />
        </div>

        {visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">No contact messages match this view.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((item) => (
              <article key={item.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-950">{item.subject}</h3>
                    <p className="mt-1 text-sm text-slate-700">{item.name} · <a className="text-blue-700 hover:underline" href={`mailto:${item.email}`}>{item.email}</a></p>
                    {item.phone && <p className="mt-1 text-xs text-slate-500">{item.phone}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (item.status === "NEW" ? "bg-amber-50 text-amber-800" : item.status === "READ" ? "bg-blue-50 text-blue-800" : "bg-emerald-50 text-emerald-800")}>{item.status}</span>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{item.message}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`contact-status-${item.id}`} className="text-xs font-medium text-slate-500">Update status</label>
                  <select id={`contact-status-${item.id}`} value={item.status} disabled={pending}
                    onChange={(event) => changeStatus(item, event.target.value as ContactStatus)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:opacity-50">
                    <option value="NEW">New</option>
                    <option value="READ">Read</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
