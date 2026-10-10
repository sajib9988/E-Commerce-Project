"use client";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  ButtonItem,
  ContentBlock,
} from "@/type/cms";
import { useState } from "react";
import { createBlock, normalizeOrder } from "@/lib/cms-utils";
type BlockEditorProps = {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
};
export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [newType, setNewType] = useState<ContentBlock["type"]>("RICH_TEXT");
  const addBlock = () => {
    onChange(normalizeOrder([...blocks, createBlock(newType, blocks.length)]));
  };
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(
      blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block,
      ),
    );
  };
  const updateContent = (
    block: ContentBlock,
    content: Record<string, unknown>,
  ) => {
    updateBlock(block.id, { content });
  };
  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
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
    onChange(normalizeOrder(blocks.filter((block) => block.id !== id)));
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex flex-wrap gap-2">
        {" "}
        <select
          value={newType}
          onChange={(event) =>
            setNewType(event.target.value as ContentBlock["type"])
          }
          className="min-w-0 flex-1 rounded-md border px-3 py-2"
        >
          {" "}
          {BLOCK_TYPES.map((type) => (
            <option key={type} value={type}>
              {" "}
              {BLOCK_LABELS[type]}{" "}
            </option>
          ))}{" "}
        </select>{" "}
        <button
          type="button"
          onClick={addBlock}
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          {" "}
          Add Block{" "}
        </button>{" "}
      </div>{" "}
      {blocks.length === 0 && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
          {" "}
          There are no blocks in this section yet.{" "}
        </p>
      )}{" "}
      {blocks.map((block, index) => (
        <div key={block.id} className="space-y-3 rounded-lg border p-4">
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {" "}
            <h3 className="font-medium"> {BLOCK_LABELS[block.type]} </h3>{" "}
            <div className="flex flex-wrap gap-2">
              {" "}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveBlock(index, -1)}
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                aria-label="Move block up"
              >
                {" "}
                ↑{" "}
              </button>{" "}
              <button
                type="button"
                disabled={index === blocks.length - 1}
                onClick={() => moveBlock(index, 1)}
                className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                aria-label="Move block down"
              >
                {" "}
                ↓{" "}
              </button>{" "}
              <button
                type="button"
                onClick={() => duplicateBlock(block)}
                className="rounded border px-2 py-1 text-sm"
              >
                {" "}
                Duplicate{" "}
              </button>{" "}
              <button
                type="button"
                onClick={() => deleteBlock(block.id)}
                className="rounded border border-red-300 px-2 py-1 text-sm text-red-600"
              >
                {" "}
                Delete{" "}
              </button>{" "}
            </div>{" "}
          </div>{" "}
          <label className="flex items-center gap-2 text-sm">
            {" "}
            <input
              type="checkbox"
              checked={block.isVisible}
              onChange={(event) =>
                updateBlock(block.id, { isVisible: event.target.checked })
              }
            />{" "}
            Show on page{" "}
          </label>{" "}
          {block.type === "RICH_TEXT" && (
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium"> Text content </label>{" "}
              <textarea
                value={String(block.content.plainText ?? "")}
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    plainText: event.target.value,
                  })
                }
                rows={5}
                className="w-full rounded-md border p-3"
                placeholder="Write your content..."
              />{" "}
            </div>
          )}{" "}
          {(block.type === "BULLET_LIST" || block.type === "CHECKLIST") && (
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium">
                {" "}
                Items (one per line){" "}
              </label>{" "}
              <textarea
                value={
                  Array.isArray(block.content.items)
                    ? block.content.items.map((item) => String(item)).join("\n")
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
              />{" "}
            </div>
          )}{" "}
          {block.type === "BUTTONS" && (
            <div className="space-y-3">
              {" "}
              {(Array.isArray(block.content.items)
                ? block.content.items
                : []
              ).map((item, itemIndex) => {
                const buttonItem = item as ButtonItem;
                const updateButton = (updates: Partial<ButtonItem>) => {
                  const items = (block.content.items as ButtonItem[]).map(
                    (current, currentIndex) =>
                      currentIndex === itemIndex
                        ? { ...current, ...updates }
                        : current,
                  );
                  updateContent(block, { ...block.content, items });
                };
                return (
                  <div
                    key={buttonItem.id || itemIndex}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {" "}
                    <input
                      value={buttonItem.label ?? ""}
                      onChange={(event) =>
                        updateButton({ label: event.target.value })
                      }
                      className="rounded-md border p-2"
                      placeholder="Button label"
                    />{" "}
                    <input
                      value={buttonItem.url ?? ""}
                      onChange={(event) =>
                        updateButton({ url: event.target.value })
                      }
                      className="rounded-md border p-2"
                      placeholder="/about"
                    />{" "}
                  </div>
                );
              })}{" "}
            </div>
          )}{" "}
          {block.type === "IMAGE" && (
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium"> Image URL </label>{" "}
              <input
                value={
                  typeof block.content.media === "string"
                    ? block.content.media
                    : String(
                        (
                          block.content.media as
                            | {
                                url?: string;
                              }
                            | null
                            | undefined
                        )?.url ?? "",
                      )
                }
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    media: event.target.value
                      ? { url: event.target.value }
                      : null,
                  })
                }
                className="w-full rounded-md border p-2"
                placeholder="https://..."
              />{" "}
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
              />{" "}
            </div>
          )}{" "}
          {block.type === "GALLERY" && (
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium">
                {" "}
                Image URLs (one per line){" "}
              </label>{" "}
              <textarea
                value={
                  Array.isArray(block.content.media)
                    ? block.content.media
                        .map((item) =>
                          typeof item === "string"
                            ? item
                            : String(
                                (
                                  item as {
                                    url?: string;
                                  }
                                ).url ?? "",
                              ),
                        )
                        .join("\n")
                    : ""
                }
                onChange={(event) =>
                  updateContent(block, {
                    ...block.content,
                    media: event.target.value
                      .split("\n")
                      .map((url) => url.trim())
                      .filter(Boolean)
                      .map((url) => ({ url })),
                  })
                }
                rows={3}
                className="w-full rounded-md border p-3"
                placeholder="https://image-1.jpg"
              />{" "}
            </div>
          )}{" "}
          {block.type === "VIDEO" && (
            <div className="space-y-2">
              {" "}
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
              />{" "}
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
              />{" "}
            </div>
          )}{" "}
          {block.type === "SPACER" && (
            <label className="block space-y-2 text-sm">
              {" "}
              <span>Height (px)</span>{" "}
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
                      Math.min(1000, Number(event.target.value) || 0),
                    ),
                  })
                }
                className="w-full rounded-md border p-2"
              />{" "}
            </label>
          )}{" "}
          <div className="grid gap-2 sm:grid-cols-3">
            {" "}
            <label className="text-sm">
              {" "}
              Alignment{" "}
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
                {" "}
                <option value="left">Left</option>{" "}
                <option value="center">Center</option>{" "}
                <option value="right">Right</option>{" "}
              </select>{" "}
            </label>{" "}
            <label className="text-sm">
              {" "}
              Width{" "}
              <select
                value={block.settings.width ?? "full"}
                onChange={(event) =>
                  updateBlock(block.id, {
                    settings: {
                      ...block.settings,
                      width: event.target.value as "full" | "wide" | "narrow",
                    },
                  })
                }
                className="mt-1 w-full rounded-md border p-2"
              >
                {" "}
                <option value="full">Full</option>{" "}
                <option value="wide">Wide</option>{" "}
                <option value="narrow">Narrow</option>{" "}
              </select>{" "}
            </label>{" "}
            <label className="text-sm">
              {" "}
              Padding{" "}
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
                {" "}
                <option value="none">None</option>{" "}
                <option value="small">Small</option>{" "}
                <option value="medium">Medium</option>{" "}
                <option value="large">Large</option>{" "}
              </select>{" "}
            </label>{" "}
          </div>{" "}
        </div>
      ))}{" "}
    </div>
  );
}
