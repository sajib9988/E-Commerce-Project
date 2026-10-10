"use client";

import { useRef, useState } from "react";
import type { MediaAsset, MediaType } from "@/type/cms";

type MediaPickerProps = {
  assets: MediaAsset[];
  onSelect: (asset: MediaAsset) => void;
  onClose: () => void;
  onUpload?: (file: File) => Promise<void>;
};

export function MediaPicker({
  assets,
  onSelect,
  onClose,
  onUpload,
}: MediaPickerProps) {
  const [filter, setFilter] = useState<MediaType | "ALL">("ALL");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = assets.filter(
    (asset) => filter === "ALL" || asset.type === filter,
  );

  const handleUpload = async (file?: File) => {
    if (!file || !onUpload) return;

    setError("");
    setUploading(true);

    try {
      await onUpload(file);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Media upload not Uploaded",
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <h2 id="media-picker-title" className="text-lg font-semibold">
            Select Media
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border px-3 py-1.5"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as MediaType | "ALL")
            }
            className="rounded-md border p-2"
          >
            <option value="ALL">All media</option>
            <option value="IMAGE">Images</option>
            <option value="VIDEO">Videos</option>
          </select>

          {onUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) =>
                  void handleUpload(event.target.files?.[0])
                }
              />

              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Media"}
              </button>
            </>
          )}
        </div>

        {error && (
          <p role="alert" className="px-4 pt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="overflow-y-auto p-4">
          {filteredAssets.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">
              No Media Found
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onSelect(asset)}
                  className="overflow-hidden rounded-lg border text-left transition hover:border-black"
                >
                  <div className="flex aspect-square items-center justify-center bg-gray-100">
                    {asset.type === "IMAGE" ? (
                      <img
                        src={asset.url}
                        alt={asset.altText || asset.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <video
                        src={asset.url}
                        className="h-full w-full object-contain"
                        muted
                        preload="metadata"
                      />
                    )}
                  </div>

                  <div className="p-2">
                    <p className="truncate text-sm font-medium">
                      {asset.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {asset.type}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}