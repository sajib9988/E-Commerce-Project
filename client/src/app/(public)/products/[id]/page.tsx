import { notFound } from "next/navigation";
import { getProductById } from "@/service/product.service";
import { ProductDetailClient } from "@/components/storefront/product-detail-client";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product || (typeof product === "object" && "success" in product && product.success === false)) notFound();
  return <ProductDetailClient product={product as any} />;
}
