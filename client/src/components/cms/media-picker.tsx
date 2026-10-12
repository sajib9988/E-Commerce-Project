"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/cms/media-picker";
import { getAllMedia, uploadMedia } from "@/service/media.service";
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
  const [error, setError] = useState("");

  const loadAssets = async () => {
    const res = await getAllMedia();

    if (!Array.isArray(res)) {
      throw new Error(res.message);
    }

    setAssets(res);
  };

  const openPicker = async () => {
    setError("");
    setLoading(true);

    try {
      await loadAssets();
      setOpen(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load media library.",
      );
    } finally {
      setLoading(false);
    }
  };

  // MediaPicker এই function-এর throw করা error নিজেই দেখায়
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await uploadMedia(formData);

    if ("success" in res && res.success === false) {
      throw new Error(res.message);
    }

    await loadAssets();
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

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {open && (
        <MediaPicker
          assets={assets}
          onUpload={handleUpload}
          onClose={() => setOpen(false)}
          onSelect={(asset) => {
            onSelect(asset);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}