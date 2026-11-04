"use client";

import { useEffect, useMemo, useState } from "react";
import type { ContentBlock } from "@/type/cms";
import { safeMediaUrl } from "@/lib/safe-url";

type CollectionOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type CollectionProduct = {
  id: string;
  name: string;
  imageUrl?: string | null;
  apliiqDesigns?: Array<{ colorId: string; mockupUrl?: string | null }>;
  regularPrice?: string | number | null;
  salePrice?: string | number | null;
  collections?: unknown[];
};

type CollectionResponse = {
  name: string;
  slug: string;
  products: Array<{ product: CollectionProduct }>;
};

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL;

async function readJson(response: Response) {
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

export function ProductCollectionBlockEditor({
  block,
  onChange,
}: {
  block: ContentBlock;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCollections() {
      if (!API_BASE) {
        setLoadError("NEXT_PUBLIC_BASE_URL is not configured.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/collections`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await readJson(response);
        setCollections(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Could not load collections.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCollections();
    return () => controller.abort();
  }, []);

  const selectedSlug = typeof block.content.collectionSlug === "string"
    ? block.content.collectionSlug
    : "";

  const selectedExists = useMemo(
    () => collections.some((collection) => collection.slug === selectedSlug),
    [collections, selectedSlug],
  );

  const update = (patch: Record<string, unknown>) => {
    onChange({ ...block.content, ...patch });
  };

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium">Homepage collection settings</p>

      <label className="block space-y-1 text-sm">
        <span>Collection</span>
        <select
          value={selectedSlug}
          onChange={(event) => update({ collectionSlug: event.target.value })}
          disabled={loading || collections.length === 0}
          className="w-full rounded-md border p-2"
        >
          <option value="">Select a collection</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.slug}>
              {collection.name} ({collection.slug})
            </option>
          ))}
        </select>
      </label>

      {loading && <p className="text-xs text-gray-500">Loading collections…</p>}
      {!loading && loadError && <p className="text-xs text-red-600">{loadError}</p>}
      {!loading && !loadError && collections.length === 0 && (
        <p className="text-xs text-amber-700">Create an active collection first, then return here to select it.</p>
      )}
      {!loading && selectedSlug && !selectedExists && (
        <p className="text-xs text-amber-700">This collection is not in the active collection list. Choose another collection.</p>
      )}

      <label className="block space-y-1 text-sm">
        <span>Section title (optional)</span>
        <input
          value={typeof block.content.title === "string" ? block.content.title : ""}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={120}
          className="w-full rounded-md border p-2"
          placeholder="e.g. Farm Animal Collection"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span>Products to display</span>
        <input
          type="number"
          min={1}
          max={24}
          value={typeof block.content.limit === "number" ? block.content.limit : 8}
          onChange={(event) => {
            const value = Number(event.target.value);
            update({ limit: Number.isFinite(value) ? Math.min(24, Math.max(1, Math.floor(value))) : 8 });
          }}
          className="w-full rounded-md border p-2"
        />
      </label>
      <p className="text-xs text-gray-500">Collection membership is managed in Products/Collections. This block only controls which collection appears, its heading, and the number of product cards.</p>
    </div>
  );
}

export function PublicProductCollectionBlock({
  slug,
  title,
  limit = 8,
}: {
  slug: string;
  title?: string;
  limit?: number;
}) {
  const [collection, setCollection] = useState<CollectionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCollection() {
      if (!API_BASE || !slug) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/collections/${encodeURIComponent(slug)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await readJson(response);
        if (!controller.signal.aborted) setCollection(data);
      } catch {
        if (!controller.signal.aborted) setCollection(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCollection();
    return () => controller.abort();
  }, [slug]);

  if (loading || !collection) return null;

  const products = collection.products
    .map((entry) => entry.product)
    .filter((product) => Boolean(product?.id && product?.name))
    .slice(0, Math.min(24, Math.max(1, limit)));

  if (products.length === 0) return null;

  const heading = title?.trim() || collection.name;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <h2 className="text-2xl font-semibold">{heading}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const designMockup = product.apliiqDesigns?.find((design) => design.mockupUrl)?.mockupUrl;
          const imageUrl = designMockup ? safeMediaUrl(designMockup) : product.imageUrl ? safeMediaUrl(product.imageUrl) : null;
          const price = product.salePrice ?? product.regularPrice;
          const formattedPrice = price === null || price === undefined
            ? null
            : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(price));

          return (
            <article key={product.id} className="min-w-0 space-y-2">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={product.name} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              ) : (
                <div className="aspect-square w-full rounded-lg bg-muted" aria-hidden="true" />
              )}
              <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
              {formattedPrice && <p className="text-sm text-muted-foreground">{formattedPrice}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
