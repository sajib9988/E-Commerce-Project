"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { createPage } from "@/service/cms.service";
import { slugify } from "@/lib/cms-utils";

export default function CreateCmsPage() {
  const router = useRouter();

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // UI states
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Automatically generate slug from page name
  const handleNameChange = (value: string) => {
    setName(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  // Submit form
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const pageName = name.trim();
    const pageSlug = slug.trim();

    if (!pageName) {
      setError("Page name is required.");
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pageSlug)) {
      setError("Slug must contain lowercase letters, numbers and dashes.");
      return;
    }

    if (seoTitle.length > 70) {
      setError("SEO title cannot exceed 70 characters.");
      return;
    }

    if (seoDescription.length > 160) {
      setError("SEO description cannot exceed 160 characters.");
      return;
    }

    setSaving(true);

    try {
      const result = await createPage({
        name: pageName,
        slug: pageSlug,
        description: description.trim(),
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
      });

      // Handle API errors
      if (
        result &&
        typeof result === "object" &&
        "success" in result &&
        result.success === false
      ) {
        throw new Error(result.message);
      }

      // Verify created page
      if (
        !result ||
        typeof result !== "object" ||
        !("id" in result) ||
        typeof result.id !== "string"
      ) {
        throw new Error("Page creation failed. Invalid API response.");
      }

      // Navigate to the newly created page editor
      router.push(`/admin/cms/${result.id}/edit`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create CMS page.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <Link
          href="/admin/cms"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Back to CMS pages
        </Link>

        <div>
          <p className="text-sm font-medium text-slate-500">
            Content management
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Create New Page
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Create a CMS page and configure its basic information.
          </p>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <section className="space-y-5 rounded-xl border bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold">Basic Information</h2>

            <p className="mt-1 text-sm text-slate-500">
              Add the page name, URL and description.
            </p>
          </div>

          {/* Page Name */}
          <div className="space-y-2">
            <label htmlFor="page-name" className="text-sm font-medium">
              Page Name *
            </label>

            <input
              id="page-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="About Us"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <label htmlFor="page-slug" className="text-sm font-medium">
              Page Slug *
            </label>

            <input
              id="page-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="about-us"
              className="w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />

            <p className="text-xs text-slate-500">
              Page URL: /{slug || "your-page-slug"}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="page-description" className="text-sm font-medium">
              Description
            </label>

            <textarea
              id="page-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Write a short internal description..."
              className="w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </section>

        {/* SEO Information */}
        <section className="space-y-5 rounded-xl border bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold">SEO Settings</h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure search engine and social sharing metadata.
            </p>
          </div>

          {/* SEO Title */}
          <div className="space-y-2">
            <label
              htmlFor="seo-title"
              className="flex items-center justify-between text-sm font-medium"
            >
              <span>SEO Title</span>

              <span className="text-xs text-slate-400">
                {seoTitle.length}/70
              </span>
            </label>

            <input
              id="seo-title"
              type="text"
              maxLength={70}
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="About Us | Your Store"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* SEO Description */}
          <div className="space-y-2">
            <label
              htmlFor="seo-description"
              className="flex items-center justify-between text-sm font-medium"
            >
              <span>SEO Description</span>

              <span className="text-xs text-slate-400">
                {seoDescription.length}/160
              </span>
            </label>

            <textarea
              id="seo-description"
              maxLength={160}
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Describe this page for search engines..."
              className="w-full resize-y rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/admin/cms"
            className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Page"}
          </button>
        </div>
      </form>
    </div>
  );
}
