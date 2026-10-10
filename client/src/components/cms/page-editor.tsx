"use client";
import { useState } from "react";
import { SectionEditor } from "./section-editor";
import { CmsPage, CmsSection } from "@/type/cms";
type PageEditorProps = {
  page: CmsPage;
  onSave: (data: {
    name: string;
    slug: string;
    description: string;
    status: CmsPage["status"];
    sections: CmsSection[];
  }) => Promise<void>;
};
export function PageEditor({ page, onSave }: PageEditorProps) {
  const [name, setName] = useState(page.name);
  const [slug, setSlug] = useState(page.slug);
  const [description, setDescription] = useState(page.description ?? "");
  const [status, setStatus] = useState<CmsPage["status"]>(page.status);
  const [sections, setSections] = useState<CmsSection[]>(page.sections ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim() || !slug.trim()) {
      setError("Page name and slug are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        status,
        sections,
      });
      setMessage("Page save request completed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Page could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {" "}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {" "}
        <h1 className="text-2xl font-bold">Page Editor</h1>{" "}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black px-5 py-2 text-white disabled:opacity-50"
        >
          {" "}
          {saving ? "Saving..." : "Save Page"}{" "}
        </button>{" "}
      </div>{" "}
      {error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {" "}
          {error}{" "}
        </p>
      )}{" "}
      {message && (
        <p
          role="status"
          className="rounded-md bg-green-50 p-3 text-sm text-green-700"
        >
          {" "}
          {message}{" "}
        </p>
      )}{" "}
      <div className="grid gap-4 rounded-lg border p-4">
        {" "}
        <label className="space-y-1 text-sm">
          {" "}
          <span className="font-medium">Page name</span>{" "}
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border p-2"
            placeholder="About Us"
          />{" "}
        </label>{" "}
        <label className="space-y-1 text-sm">
          {" "}
          <span className="font-medium">Slug</span>{" "}
          <input
            required
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="w-full rounded-md border p-2"
            placeholder="about-us"
          />{" "}
        </label>{" "}
        <label className="space-y-1 text-sm">
          {" "}
          <span className="font-medium">Description</span>{" "}
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="w-full rounded-md border p-2"
            placeholder="Describe this page..."
          />{" "}
        </label>{" "}
        <label className="space-y-1 text-sm">
          {" "}
          <span className="font-medium">Status</span>{" "}
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as CmsPage["status"])
            }
            className="w-full rounded-md border p-2"
          >
            {" "}
            <option value="DRAFT">Draft</option>{" "}
            <option value="PUBLISHED">Published</option>{" "}
            <option value="ARCHIVED">Archived</option>{" "}
          </select>{" "}
        </label>{" "}
      </div>{" "}
      <SectionEditor sections={sections} onChange={setSections} />{" "}
      <div className="flex justify-end">
        {" "}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black px-5 py-2 text-white disabled:opacity-50"
        >
          {" "}
          {saving ? "Saving..." : "Save Page"}{" "}
        </button>{" "}
      </div>{" "}
    </form>
  );
}
