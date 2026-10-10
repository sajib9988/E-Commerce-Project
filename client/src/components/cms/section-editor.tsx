"use client";
import { useState } from "react";
import { BlockEditor } from "./block-editor";
import { CmsSection } from "@/type/cms";
import { createSection, normalizeOrder } from "@/lib/cms-utils";
type SectionEditorProps = {
  sections: CmsSection[];
  onChange: (sections: CmsSection[]) => void;
};
export function SectionEditor({ sections, onChange }: SectionEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const addSection = () => {
    const section = createSection(
      `Section ${sections.length + 1}`,
      sections.length,
    );
    onChange(normalizeOrder([...sections, section]));
    setExpandedId(section.id);
  };
  const updateSection = (id: string, updates: Partial<CmsSection>) => {
    onChange(
      sections.map((section) =>
        section.id === id ? { ...section, ...updates } : section,
      ),
    );
  };
  const moveSection = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const next = [...sections];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(normalizeOrder(next));
  };
  const deleteSection = (id: string) => {
    onChange(normalizeOrder(sections.filter((section) => section.id !== id)));
    if (expandedId === id) setExpandedId(null);
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <h2 className="text-lg font-semibold">Page Sections</h2>{" "}
        <button
          type="button"
          onClick={addSection}
          className="rounded-md bg-black px-4 py-2 text-sm text-white"
        >
          {" "}
          + Add Section{" "}
        </button>{" "}
      </div>{" "}
      {sections.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
          {" "}
          No sections yet. Click Add Section to get started.{" "}
        </p>
      )}{" "}
      {sections.map((section, index) => {
        const expanded = expandedId === section.id;
        return (
          <div key={section.id} className="rounded-lg border">
            {" "}
            <div className="flex flex-wrap items-center gap-2 p-3">
              {" "}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : section.id)}
                className="min-w-0 flex-1 text-left font-medium"
              >
                {" "}
                {expanded ? "⌄" : "›"} {section.name || `Section ${index + 1}`}{" "}
                <span className="ml-2 text-xs text-gray-500">
                  {" "}
                  ({section.blocks.length} blocks){" "}
                </span>{" "}
              </button>{" "}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveSection(index, -1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
                aria-label="Move section up"
              >
                {" "}
                ↑{" "}
              </button>{" "}
              <button
                type="button"
                disabled={index === sections.length - 1}
                onClick={() => moveSection(index, 1)}
                className="rounded border px-2 py-1 disabled:opacity-40"
                aria-label="Move section down"
              >
                {" "}
                ↓{" "}
              </button>{" "}
              <button
                type="button"
                onClick={() => deleteSection(section.id)}
                className="rounded border border-red-300 px-2 py-1 text-sm text-red-600"
              >
                {" "}
                Delete{" "}
              </button>{" "}
            </div>{" "}
            {expanded && (
              <div className="space-y-4 border-t p-4">
                {" "}
                <label className="block space-y-1 text-sm">
                  {" "}
                  <span>Section name</span>{" "}
                  <input
                    value={section.name}
                    onChange={(event) =>
                      updateSection(section.id, { name: event.target.value })
                    }
                    className="w-full rounded-md border p-2"
                  />{" "}
                </label>{" "}
                <label className="flex items-center gap-2 text-sm">
                  {" "}
                  <input
                    type="checkbox"
                    checked={section.isVisible}
                    onChange={(event) =>
                      updateSection(section.id, {
                        isVisible: event.target.checked,
                      })
                    }
                  />{" "}
                  Show section on page{" "}
                </label>{" "}
                <div className="grid gap-3 sm:grid-cols-3">
                  {" "}
                  <label className="text-sm">
                    {" "}
                    Columns{" "}
                    <select
                      value={section.settings.columns ?? 1}
                      onChange={(event) =>
                        updateSection(section.id, {
                          settings: {
                            ...section.settings,
                            columns: Number(event.target.value) as 1 | 2 | 3,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-md border p-2"
                    >
                      {" "}
                      <option value={1}>1 Column</option>{" "}
                      <option value={2}>2 Columns</option>{" "}
                      <option value={3}>3 Columns</option>{" "}
                    </select>{" "}
                  </label>{" "}
                  <label className="text-sm">
                    {" "}
                    Background{" "}
                    <input
                      value={section.settings.background ?? "transparent"}
                      onChange={(event) =>
                        updateSection(section.id, {
                          settings: {
                            ...section.settings,
                            background: event.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full rounded-md border p-2"
                      placeholder="transparent or #f5f5f5"
                    />{" "}
                  </label>{" "}
                  <label className="text-sm">
                    {" "}
                    Padding{" "}
                    <select
                      value={section.settings.padding ?? "medium"}
                      onChange={(event) =>
                        updateSection(section.id, {
                          settings: {
                            ...section.settings,
                            padding: event.target.value as
                              | "none"
                              | "small"
                              | "medium"
                              | "large",
                          },
                        })
                      }
                      className="mt-1 w-full rounded-md border p-2"
                    >
                      {" "}
                      <option value="none">None</option>{" "}
                      <option value="small">Small</option>{" "}
                      <option value="medium">Medium</option>{" "}
                      <option value="large">Large</option>{" "}
                    </select>{" "}
                  </label>{" "}
                </div>{" "}
                <BlockEditor
                  blocks={section.blocks}
                  onChange={(blocks) => updateSection(section.id, { blocks })}
                />{" "}
              </div>
            )}{" "}
          </div>
        );
      })}{" "}
    </div>
  );
}
