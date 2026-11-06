import { getCategories } from "@/service/admin.service";
import { getAdminCollections } from "@/service/collection.service";
import { getAdminRows } from "@/components/admin/admin-resource-page";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewAdminProductPage() {
  const [categoryResult, collectionResult] = await Promise.all([
    getCategories(),
    getAdminCollections({ page: 1, limit: 100, sortBy: "name", sortOrder: "asc" }),
  ]);
  const categories = getAdminRows(categoryResult) as Array<{
    id: string; name: string; subcategories?: Array<{ id: string; name: string }>;
  }>;
  const collections = getAdminRows(collectionResult) as Array<{ id: string; name: string }>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-slate-500">Catalog management</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Create product</h1>
        <p className="mt-2 text-sm text-slate-600">Add a product to your store catalog.</p>
      </header>
      {categories.length === 0 ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No active categories were returned. Create a category before adding a product.
        </div>
      ) : (
        <ProductForm categories={categories} collections={collections} />
      )}
    </div>
  );
}
