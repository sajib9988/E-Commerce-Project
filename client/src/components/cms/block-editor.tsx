
"use client";

import { useState } from "react";
import {
  AccordionItem,
  BLOCK_LABELS,
  BLOCK_TYPES,
  ButtonItem,
  ContentBlock,
  RichTextContent,
} from "@/type/cms";
import { createBlock, normalizeOrder } from "@/lib/cms-utils";
import { RichTextEditor } from "@/components/cms/rich-text-editor";
import { MediaPickerButton } from "@/components/cms/media-picker-button";
type BlockEditorProps = {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
};

function getButtonItems(block: ContentBlock): ButtonItem[] {
  if (!Array.isArray(block.content.items)) return [];

  return block.content.items.filter(
    (item): item is ButtonItem =>
      Boolean(item && typeof item === "object"),
  );
}

function getMediaUrl(value: unknown): string {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "url" in value) {
    return String((value as { url?: unknown }).url ?? "");
  }

  return "";
}

export function BlockEditor({
  blocks,
  onChange,
}: BlockEditorProps) {
  const [newType, setNewType] =
    useState<ContentBlock["type"]>("RICH_TEXT");

  const addBlock = () => {
    onChange(
      normalizeOrder([
        ...blocks,
        createBlock(newType, blocks.length),
      ]),
    );
  };

  const updateBlock = (
    id: string,
    updates: Partial<ContentBlock>,
  ) => {
    onChange(
      blocks.map((block) =>
        block.id === id
          ? { ...block, ...updates }
          : block,
      ),
    );
  };

  const updateContent = (
    block: ContentBlock,
    content: Record<string, unknown>,
  ) => {
    updateBlock(block.id, {
      content: content as ContentBlock["content"],
    });
  };

  const moveBlock = (
    index: number,
    direction: -1 | 1,
  ) => {
    const nextIndex = index + direction;

    if (
      nextIndex < 0 ||
      nextIndex >= blocks.length
    ) {
      return;
    }

    const next = [...blocks];

    [next[index], next[nextIndex]] = [
      next[nextIndex],
      next[index],
    ];

    onChange(normalizeOrder(next));
  };

  const duplicateBlock = (block: ContentBlock) => {
    const copy: ContentBlock = {
      ...block,
      id: crypto.randomUUID(),
      content: structuredClone(block.content),
      settings: { ...block.settings },
      sortOrder: blocks.length,
    };

    onChange(normalizeOrder([...blocks, copy]));
  };

  const deleteBlock = (id: string) => {
    onChange(
      normalizeOrder(
        blocks.filter((block) => block.id !== id),
      ),
    );
  };

  const updateButtonItems = (
    block: ContentBlock,
    items: ButtonItem[],
  ) => {
    updateContent(block, {
      ...block.content,
      items,
    });
  };
function getAccordionItems(block: ContentBlock): AccordionItem[] {
  if (!Array.isArray(block.content.items)) return [];
  return block.content.items.filter(
    (item): item is AccordionItem => Boolean(item && typeof item === "object"),
  );
}
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={newType}
          onChange={(event) =>
            setNewType(
              event.target.value as ContentBlock["type"],
            )
          }
          className="min-w-0 flex-1 rounded-md border px-3 py-2"
          aria-label="Block type"
        >
          {BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {BLOCK_LABELS[type]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={addBlock}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Add Block
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
          There are no blocks in this section yet.
        </p>
      )}

      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">
              {BLOCK_LABELS[block.type]}
            </h3>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveBlock(index, -1)}
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                aria-label="Move block up"
              >
                ↑
              </button>

              <button
                type="button"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                aria-label="Move block down"
              >
                ↓
              </button>

              <button
                type="button"
                onClick={() => duplicateBlock(block)}
                className="rounded border px-2 py-1 text-sm"
              >
                Duplicate
              </button>

              <button
                type="button"
                onClick={() => deleteBlock(block.id)}
                className="rounded border border-red-300 px-2 py-1 text-sm text-red-600"
              >
                Delete
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(block.isVisible)}
              onChange={(event) =>
                updateBlock(block.id, {
                  isVisible: event.target.checked,
                })
              }
            />
            Show on page
          </label>

{block.type === "RICH_TEXT" && (
  <div className="space-y-2">
    <label className="text-sm font-medium">Text content</label>
    <RichTextEditor
      value={{
        editorState:
          typeof block.content.editorState === "string"
            ? block.content.editorState
            : null,
        plainText:
          typeof block.content.plainText === "string"
            ? block.content.plainText
            : "",
      }}
      onChange={(value: RichTextContent) =>
        updateContent(block, { ...block.content, ...value })
      }
    />
  </div>
)}

          {(block.type === "BULLET_LIST" ||
            block.type === "CHECKLIST") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Items (one per line)
              </label>

              <textarea
                value={
                  Array.isArray(block.content.items)
                    ? block.content.items.map(String).join("\n")
                    : ""
                }
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    items: event.target.value.split("\n"),
                  })
                }
                rows={4}
                className="w-full rounded-md border p-3"
                placeholder={"First item\nSecond item"}
              />
            </div>
          )}

          {block.type === "BUTTONS" && (
            <div className="space-y-3">
              {getButtonItems(block).map(
                (item, itemIndex) => (
                  <div
                    key={item.id || itemIndex}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      value={item.label ?? ""}
                      onChange={(event) => {
                        const items = getButtonItems(
                          block,
                        ).map((current, i) =>
                          i === itemIndex
                            ? {
                                ...current,
                                label: event.target.value,
                              }
                            : current,
                        );

                        updateButtonItems(block, items);
                      }}
                      className="rounded-md border p-2"
                      placeholder="Button label"
                      aria-label={`Button ${itemIndex + 1} label`}
                    />

                    <input
                      value={item.url ?? ""}
                      onChange={(event) => {
                        const items = getButtonItems(
                          block,
                        ).map((current, i) =>
                          i === itemIndex
                            ? {
                                ...current,
                                url: event.target.value,
                              }
                            : current,
                        );

                        updateButtonItems(block, items);
                      }}
                      className="rounded-md border p-2"
                      placeholder="/about"
                      aria-label={`Button ${itemIndex + 1} URL`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        updateButtonItems(
                          block,
                          getButtonItems(block).filter(
                            (_, i) => i !== itemIndex,
                          ),
                        )
                      }
                      className="rounded border border-red-300 px-3 py-2 text-sm text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  updateButtonItems(block, [
                    ...getButtonItems(block),
                    {
                      id: crypto.randomUUID(),
                      label: "New button",
                      url: "/",
                    },
                  ])
                }
                className="rounded-md border px-3 py-2 text-sm"
              >
                Add Button
              </button>
            </div>
          )}

   {block.type === "IMAGE" && (
  <div className="space-y-2">
    <label className="text-sm font-medium">Image</label>

    {getMediaUrl(block.content.media) && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={getMediaUrl(block.content.media)}
        alt=""
        className="h-32 rounded-md border object-contain"
      />
    )}

    <MediaPickerButton
      label={
        getMediaUrl(block.content.media)
          ? "Change image"
          : "Choose from library"
      }
      onSelect={(asset) =>
        updateContent(block, {
          ...block.content,
          media: { id: asset.id, url: asset.url },
          altText:
            String(block.content.altText ?? "") || asset.altText || "",
        })
      }
    />

    <input
      value={getMediaUrl(block.content.media)}
      onChange={(event) =>
        updateContent(block, {
          ...block.content,
          media: event.target.value ? { url: event.target.value } : null,
        })
      }
      className="w-full rounded-md border p-2"
      placeholder="or paste an external image URL"
    />

    <input
      value={String(block.content.altText ?? "")}
      onChange={(event) =>
        updateContent(block, {
          ...block.content,
          altText: event.target.value,
        })
      }
      className="w-full rounded-md border p-2"
      placeholder="Image alt text"
    />
  </div>
)}

{block.type === "VIDEO" && (
  <div className="space-y-2">
    <MediaPickerButton
      label="Choose video from library"
      onSelect={(asset) =>
        updateContent(block, { ...block.content, url: asset.url })
      }
    />

    <input
      value={String(block.content.url ?? "")}
      onChange={(event) =>
        updateContent(block, { ...block.content, url: event.target.value })
      }
      className="w-full rounded-md border p-2"
      placeholder="or paste a video URL"
    />

    <input
      value={String(block.content.caption ?? "")}
      onChange={(event) =>
        updateContent(block, { ...block.content, caption: event.target.value })
      }
      className="w-full rounded-md border p-2"
      placeholder="Video caption"
    />
  </div>
)}

          {block.type === "VIDEO" && (
            <div className="space-y-2">
              <input
                value={String(block.content.url ?? "")}
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    url: event.target.value,
                  })
                }
                className="w-full rounded-md border p-2"
                placeholder="Video URL"
              />

              <input
                value={String(block.content.caption ?? "")}
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    caption: event.target.value,
                  })
                }
                className="w-full rounded-md border p-2"
                placeholder="Video caption"
              />
            </div>
          )}
type GalleryItem = { id?: string; url: string };

function getGalleryItems(block: ContentBlock): GalleryItem[] {
  if (!Array.isArray(block.content.media)) return [];

  return block.content.media
    .map((value): GalleryItem => {
      const id =
        value && typeof value === "object" && "id" in value
          ? String((value as { id?: unknown }).id ?? "")
          : "";

      return { id: id || undefined, url: getMediaUrl(value) };
    })
    .filter((item) => item.url.length > 0);
}
          {block.type === "SPACER" && (
            <label className="block space-y-2 text-sm">
              <span>Height (px)</span>

              <input
                type="number"
                min={0}
                max={1000}
                value={Number(block.content.height ?? 32)}
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    height: Math.max(
                      0,
                      Math.min(
                        1000,
                        Number(event.target.value) || 0,
                      ),
                    ),
                  })
                }
                className="w-full rounded-md border p-2"
              />
            </label>
          )}
{block.type === "ACCORDION" && (
  <div className="space-y-3">
    {getAccordionItems(block).map((item, i) => {
      const setItems = (items: AccordionItem[]) =>
        updateContent(block, { ...block.content, items });
      const patch = (changes: Partial<AccordionItem>) =>
        setItems(
          getAccordionItems(block).map((c, idx) =>
            idx === i ? { ...c, ...changes } : c,
          ),
        );

      return (
        <div key={item.id || i} className="space-y-2 rounded-md border p-3">
          <input
            value={item.label ?? ""}
            onChange={(e) => patch({ label: e.target.value })}
            className="w-full rounded-md border p-2"
            placeholder="Question"
          />
          <textarea
            value={item.value ?? ""}
            onChange={(e) => patch({ value: e.target.value })}
            rows={3}
            className="w-full rounded-md border p-2"
            placeholder="Answer"
          />
          <button
            type="button"
            onClick={() =>
              setItems(getAccordionItems(block).filter((_, idx) => idx !== i))
            }
            className="rounded border border-red-300 px-3 py-1 text-sm text-red-600"
          >
            Remove
          </button>
        </div>
      );
    })}
    <button
      type="button"
      onClick={() =>
        updateContent(block, {
          ...block.content,
          items: [
            ...getAccordionItems(block),
            { id: crypto.randomUUID(), label: "Question", value: "Answer" },
          ],
        })
      }
      className="rounded-md border px-3 py-2 text-sm"
    >
      Add Item
    </button>
  </div>
)}
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-sm">
              Alignment

              <select
                value={block.settings.alignment ?? "left"}
                onChange={(event) =>
                  updateBlock(block.id, {
                    settings: {
                      ...block.settings,
                      alignment: event.target.value as
                        | "left"
                        | "center"
                        | "right",
                    },
                  })
                }
                className="mt-1 w-full rounded-md border p-2"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>

            <label className="text-sm">
              Width

              <select
                value={block.settings.width ?? "full"}
                onChange={(event) =>
                  updateBlock(block.id, {
                    settings: {
                      ...block.settings,
                      width: event.target.value as
                        | "full"
                        | "wide"
                        | "narrow",
                    },
                  })
                }
                className="mt-1 w-full rounded-md border p-2"
              >
                <option value="full">Full</option>
                <option value="wide">Wide</option>
                <option value="narrow">Narrow</option>
              </select>
            </label>

            <label className="text-sm">
              Padding

              <select
                value={block.settings.padding ?? "medium"}
                onChange={(event) =>
                  updateBlock(block.id, {
                    settings: {
                      ...block.settings,
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
                <option value="none">None</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
