import { notFound } from "next/navigation";
import { getCategories } from "@/service/admin.service";
import { getAdminCollections } from "@/service/collection.service";
import { getAdminProductById } from "@/service/product.service";
import { getAdminRows } from "@/components/admin/admin-resource-page";
import { ProductForm } from "@/components/admin/product-form";

function isApiError(value: unknown): boolean {
  return typeof value === "object" && value !== null && "success" in value && value.success === false;
}

export default async function EditAdminProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [productResult, categoryResult, collectionResult] = await Promise.all([
    getAdminProductById(id),
    getCategories(),
    getAdminCollections({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" }),
  ]);

  if (isApiError(productResult)) notFound();
  const product = (
    typeof productResult === "object" && productResult !== null && "data" in productResult
      ? productResult.data
      : productResult
  ) as {
    id: string; name: string; description?: string | null; regularPrice: number | string;
    salePrice?: number | string | null; brand?: string | null; sku?: string | null;
    apliiqDesignSku?: string | null; stockQuantity?: number; isActive?: boolean;
    categoryId: string; subcategoryId: string; imageUrl?: string | null; sizes?: string[];
    collections?: Array<{ collectionId?: string; collection?: { id: string } }>;
  };

  const categories = getAdminRows(categoryResult) as Array<{
    id: string; name: string; subcategories?: Array<{ id: string; name: string }>;
  }>;
  const collections = getAdminRows(collectionResult) as Array<{ id: string; name: string }>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500">Catalog management</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Edit product</h1>
        <p className="mt-2 text-sm text-slate-600">Update product details, pricing and storefront visibility.</p>
      </header>
      <ProductForm product={product} categories={categories} collections={collections} />
    </div>
  );
}
