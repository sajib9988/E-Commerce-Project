"use client";

import Link from "next/link";
import type { CmsPageListItem } from "@/type/cms";

export function CmsPagesClient({
  pages,
  error,
}: {
  pages: CmsPageListItem[];
  error?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Content management
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight">CMS pages</h1>

          <p className="mt-2 text-sm text-slate-600">
            Edit page sections and blocks, preview drafts, and publish content.
          </p>
        </div>

        {/* Create New Page */}
        <Link
          href="/admin/cms/new"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <span className="text-lg leading-none">+</span>
          Create New Page
        </Link>
      </header>

      {/* Error Message */}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </p>
      )}

      {/* CMS Pages Table */}
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Page</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Sections</th>
              <th className="px-5 py-3">Updated</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {pages.map((page) => (
              <tr key={page.id}>
                <td className="px-5 py-4 font-medium">{page.name}</td>

                <td className="px-5 py-4 font-mono text-xs">{page.slug}</td>

                <td className="px-5 py-4">{page.status}</td>

                <td className="px-5 py-4">{page._count?.sections ?? 0}</td>

                <td className="px-5 py-4">
                  {new Date(page.updatedAt).toLocaleDateString("en-US")}
                </td>

                <td className="px-5 py-4">
                  <Link
                    href={`/admin/cms/${page.id}/edit`}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-slate-50"
                  >
                    Edit / Preview
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {pages.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">No CMS pages found.</p>

            <p className="mt-2 text-xs text-slate-400">
              Create your first CMS page to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
