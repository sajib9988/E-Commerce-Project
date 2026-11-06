"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Edit3, Loader2, PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/service/product.service";

type ProductRow = {
  id: string;
  name?: string;
  sku?: string | null;
  regularPrice?: number | string;
  salePrice?: number | string | null;
  stockQuantity?: number;
  isActive?: boolean;
  imageUrl?: string | null;
  category?: { name?: string } | null;
};

export function AdminProductsClient({ products, error }: { products: ProductRow[]; error?: string }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(product: ProductRow) {
    if (!window.confirm(`Archive "${product.name ?? "this product"}"? It will be hidden from the storefront.`)) return;
    setDeletingId(product.id);
    try {
      const result = await deleteProduct(product.id);
      if (typeof result === "object" && result !== null && "success" in result && result.success === false) {
        toast.error("message" in result ? String(result.message) : "Could not archive product.");
        return;
      }
      toast.success("Product archived successfully.");
      router.refresh();
    } catch {
      toast.error("Could not archive product. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (error) {
    return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-slate-500">Catalog management</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Products</h1><p className="mt-2 text-sm text-slate-600">Create, edit and archive products in your catalog.</p></div>
        <Button render={<Link href="/admin/products/new" />}><Plus /> Add product</Button>
      </div>
      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <PackagePlus className="mx-auto size-9 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">No products yet</h2>
          <p className="mt-1 text-sm text-slate-500">Create your first product to start building the catalog.</p>
          <Button render={<Link href="/admin/products/new" />} className="mt-4"><Plus /> Create product</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3.5">Product</th><th className="px-5 py-3.5">Category</th><th className="px-5 py-3.5">SKU</th><th className="px-5 py-3.5">Price</th><th className="px-5 py-3.5">Stock</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4"><div className="flex items-center gap-3">
                    {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-11 rounded-lg border border-slate-200 object-cover" /> : <div className="flex size-11 items-center justify-center rounded-lg bg-slate-100"><PackagePlus className="size-5 text-slate-400" /></div>}
                    <span className="font-semibold text-slate-900">{product.name ?? "Unnamed product"}</span>
                  </div></td>
                  <td className="px-5 py-4 text-slate-600">{product.category?.name ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-600">{product.sku ?? "—"}</td>
                  <td className="px-5 py-4 text-slate-700">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(product.salePrice ?? product.regularPrice ?? 0))}</td>
                  <td className="px-5 py-4 text-slate-600">{product.stockQuantity ?? 0}</td>
                  <td className="px-5 py-4"><span className={product.isActive ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"}>{product.isActive ? "Active" : "Archived"}</span></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2">
                    <Button render={<Link href={`/admin/products/${product.id}/edit`} />} variant="outline" size="sm"><Edit3 /> Edit</Button>
                    <Button type="button" variant="destructive" size="sm" disabled={deletingId === product.id || product.isActive === false} onClick={() => handleDelete(product)}>
                      {deletingId === product.id ? <Loader2 className="animate-spin" /> : <Trash2 />} {product.isActive === false ? "Archived" : "Archive"}
                    </Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
