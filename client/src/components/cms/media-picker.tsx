
"use client";

import { useRef, useState } from "react";

import {
  getAllMedia,
  uploadMedia,
} from "@/service/media.service";

import type { MediaAsset } from "@/type/cms";

type MediaPickerButtonProps = {
  label: string;
  onSelect: (asset: MediaAsset) => void;
};

export function MediaPickerButton({
  label,
  onSelect,
}: MediaPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = async () => {
    const result = await getAllMedia();

    if (!Array.isArray(result)) {
      throw new Error(
        "message" in result
          ? String(result.message)
          : "Could not load media library.",
      );
    }

    setAssets(result);
  };

  const openPicker = async () => {
    setError("");
    setLoading(true);

    try {
      await loadAssets();
      setOpen(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load media library.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadMedia(formData);

      if (
        !Array.isArray(result) &&
        "success" in result &&
        result.success === false
      ) {
        throw new Error(
          "message" in result
            ? String(result.message)
            : "Upload failed.",
        );
      }

      await loadAssets();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload media.",
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        disabled={loading}
        className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
      >
        {loading ? "Loading..." : label}
      </button>

      {error && !open && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Media library"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 text-gray-900 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Media Library
              </h2>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleUpload}
                disabled={uploading}
                className="block w-full text-sm"
              />

              {uploading && (
                <p className="mt-2 text-sm text-gray-500">
                  Uploading media...
                </p>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mb-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {assets.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-gray-500">
                No media found. Upload an image or video.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {assets.map((asset) => {
                  const isVideo =
                    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(
                      asset.url,
                    );

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onSelect(asset);
                        setOpen(false);
                      }}
                      className="overflow-hidden rounded-lg border text-left transition hover:border-black hover:ring-1 hover:ring-black"
                    >
                      {isVideo ? (
                        <video
                          src={asset.url}
                          muted
                          preload="metadata"
                          className="h-28 w-full bg-gray-100 object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={asset.url}
                          alt={asset.altText ?? ""}
                          className="h-28 w-full bg-gray-100 object-contain"
                        />
                      )}

                      <span className="block truncate p-2 text-xs">
                        {asset.altText || asset.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
