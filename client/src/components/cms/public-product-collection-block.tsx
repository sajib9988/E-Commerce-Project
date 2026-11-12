import Image from "next/image";
import Link from "next/link";
import { getCollectionBySlug } from "@/service/collection.service";
import { safeMediaUrl } from "@/lib/safe-url";

type Product = {
  id: string;
  slug?: string | null;
  name: string;
  imageUrl?: string | null;
  regularPrice?: string | number | null;
  salePrice?: string | number | null;
  apliiqDesigns?: Array<{ mockupUrl?: string | null }>;
};

type CollectionResponse = {
  name: string;
  products?: Array<{ product?: Product | null }>;
};

type ApiError = { success: false; message: string };

function isApiError(value: unknown): value is ApiError {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}

export async function PublicProductCollectionBlock({
  slug,
  title,
  limit = 8,
}: {
  slug: string;
  title?: string;
  limit?: number;
}) {
  if (!slug) return null;

  const result = await getCollectionBySlug(slug);
  if (!result || isApiError(result)) return null;

  const collection = result as CollectionResponse;
  const products = (collection.products ?? [])
    .map((entry) => entry.product)
    .filter((product): product is Product => Boolean(product?.id && product.name))
    .slice(0, Math.min(24, Math.max(1, limit)));

  if (products.length === 0) return null;

  const heading = title?.trim() || collection.name;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-5">
      <h2 className="text-2xl font-semibold">{heading}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => {
          const mockup = product.apliiqDesigns?.find((design) => design.mockupUrl)?.mockupUrl;
          const imageUrl = mockup ? safeMediaUrl(mockup) : product.imageUrl ? safeMediaUrl(product.imageUrl) : null;
          const price = product.salePrice ?? product.regularPrice;
          const formattedPrice = price == null
            ? null
            : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(price));

          return (
            <Link
              key={product.id}
              href={`/products/${encodeURIComponent(product.slug || product.id)}`}
              className="group min-w-0 space-y-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2"
            >
              {imageUrl ? (
                <Image src={imageUrl} alt={product.name} width={640} height={640} sizes="(max-width: 640px) 50vw, 25vw" className="aspect-square w-full rounded-lg object-cover transition group-hover:opacity-90" unoptimized />
              ) : (
                <div className="aspect-square w-full rounded-lg bg-muted" aria-hidden="true" />
              )}
              <h3 className="line-clamp-2 text-sm font-medium group-hover:underline">{product.name}</h3>
              {formattedPrice && <p className="text-sm text-muted-foreground">{formattedPrice}</p>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
