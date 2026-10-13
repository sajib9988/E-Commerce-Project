
"use client";

import { useState } from "react";
import { SectionEditor } from "./section-editor";
import { MediaPickerButton } from "./media-picker";
import { slugify } from "@/lib/cms-utils";
import type { CmsPage, CmsSection } from "@/type/cms";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEO_TITLE_MAX = 70;
const SEO_DESC_MAX = 160;

export type PageFormData = {
  name: string;
  slug: string;
  description: string;
  status: CmsPage["status"];
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  publishAt: string | null;
  sections: CmsSection[];
};

type PageEditorProps = {
  page: CmsPage;
  onSave: (data: PageFormData) => Promise<CmsPage | void>;
};

function toLocalInput(iso?: string | null): string {
  if (!iso) return "";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const p = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(
    d.getDate(),
  )}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const fromLocalInput = (v: string) =>
  v ? new Date(v).toISOString() : null;

export function PageEditor({ page, onSave }: PageEditorProps) {
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);

  // Existing page-এর slug স্বয়ংক্রিয়ভাবে পরিবর্তন হবে না।
  const [slugTouched, setSlugTouched] = useState(Boolean(page.slug));

  const [description, setDescription] = useState(
    page.description ?? "",
  );
  const [status, setStatus] = useState<CmsPage["status"]>(
    page.status,
  );
  const [seoTitle, setSeoTitle] = useState(page.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    page.seoDescription ?? "",
  );
  const [ogImage, setOgImage] = useState(page.ogImage ?? "");
  const [publishAt, setPublishAt] = useState(
    toLocalInput(page.publishAt),
  );
  const [sections, setSections] = useState<CmsSection[]>(
    page.sections ?? [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);

    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Page name is required.");
      return;
    }

    if (!SLUG_RE.test(slug.trim())) {
      setError(
        "Slug must be lowercase letters, numbers and dashes (e.g. about-us).",
      );
      return;
    }

    let scheduledAt: string | null;

    try {
      scheduledAt = fromLocalInput(publishAt);
    } catch {
      setError("Please enter a valid publish date.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        status,
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        ogImage: ogImage.trim(),
        publishAt: scheduledAt,
        sections,
      });

      setMessage("Page saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Page could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveButton = (
    <button
      type="submit"
      disabled={saving}
      className="rounded-md bg-black px-5 py-2 text-white disabled:opacity-50"
    >
      {saving ? "Saving..." : "Save Page"}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Page Editor</h1>
        {saveButton}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700"
        >
          {message}
        </p>
      )}

      {/* Basic page information */}
      <div className="grid gap-4 rounded-lg border p-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Page name</span>
          <input
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-md border p-2"
            placeholder="About Us"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Slug</span>
          <input
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className="w-full rounded-md border p-2 font-mono"
            placeholder="about-us"
          />
          <span className="text-xs text-gray-500">
            URL: /{slug || "…"}
          </span>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">
            Description (internal)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-md border p-2"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as CmsPage["status"])
              }
              className="w-full rounded-md border p-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">
              Publish at (optional)
            </span>
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(e) => setPublishAt(e.target.value)}
              className="w-full rounded-md border p-2"
            />
            <span className="text-xs text-gray-500">
              A future publish date should prevent public
              visibility until the scheduled time.
            </span>
          </label>
        </div>
      </div>

      {/* SEO and social sharing */}
      <fieldset className="grid gap-4 rounded-lg border p-4">
        <legend className="px-2 text-sm font-semibold">
          SEO &amp; Social
        </legend>

        <label className="space-y-1 text-sm">
          <span className="flex justify-between font-medium">
            SEO title
            <span
              className={
                seoTitle.length > SEO_TITLE_MAX
                  ? "text-red-600"
                  : "text-gray-500"
              }
            >
              {seoTitle.length}/{SEO_TITLE_MAX}
            </span>
          </span>
          <input
            value={seoTitle}
            maxLength={SEO_TITLE_MAX}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="w-full rounded-md border p-2"
            placeholder={name || "Defaults to page name"}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="flex justify-between font-medium">
            SEO description
            <span className="text-gray-500">
              {seoDescription.length}/{SEO_DESC_MAX}
            </span>
          </span>
          <textarea
            value={seoDescription}
            maxLength={SEO_DESC_MAX}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border p-2"
          />
        </label>

        <div className="space-y-2 text-sm">
          <span className="font-medium">Open Graph image</span>

          {ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ogImage}
              alt=""
              className="h-32 rounded-md border object-contain"
            />
          )}

          <div className="flex flex-wrap gap-2">
            <MediaPickerButton
              label={ogImage ? "Change image" : "Choose from library"}
              onSelect={(asset) => setOgImage(asset.url)}
            />

            {ogImage && (
              <button
                type="button"
                onClick={() => setOgImage("")}
                className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-600"
              >
                Remove
              </button>
            )}
          </div>

          <input
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            className="w-full rounded-md border p-2"
            placeholder="or paste image URL (1200×630 recommended)"
          />
        </div>
      </fieldset>

      <SectionEditor
        sections={sections}
        onChange={setSections}
      />

      <div className="flex justify-end">{saveButton}</div>
    </form>
  );
}
