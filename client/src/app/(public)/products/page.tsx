import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/service/product.service";
import { getPublicCategories } from "@/service/category.service";

export const instant = false;

type Search = { q?: string; search?: string; categoryId?: string; minPrice?: string; maxPrice?: string; sortBy?: string; sortOrder?: string; page?: string };
type Product = { id: string; name: string; imageUrl: string; regularPrice: string | number; salePrice?: string | number | null; category?: { id: string; name: string } | null };
type Result = { items?: Product[]; pagination?: { page: number; totalPages: number; total: number } } | Product[] | { success: false; message: string };
const money = (value: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

export default async function ShopPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const query = params.q ?? params.search ?? "";
  const filters = { search: query, categoryId: params.categoryId || undefined, minPrice: params.minPrice ? Number(params.minPrice) : undefined, maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined, sortBy: params.sortBy || "createdAt", sortOrder: params.sortOrder === "asc" ? "asc" as const : "desc" as const, page: Math.max(1, Number(params.page) || 1), limit: 12 };
  const [result, allCategories] = await Promise.all([getProducts(filters) as Promise<Result>, getPublicCategories()]);
  const failed = !Array.isArray(result) && "success" in result && result.success === false;
  const data = !Array.isArray(result) && !("success" in result && result.success === false)
    ? result as { items?: Product[]; pagination?: { page: number; totalPages: number; total: number } }
    : undefined;
  const items: Product[] = Array.isArray(result) ? result : data?.items ?? [];
  const pagination = data?.pagination;
  const errorMessage = failed ? (result as { success: false; message: string }).message : "";
  const categories = allCategories;
  const makeHref = (page: number) => { const next = new URLSearchParams(); Object.entries({ ...params, page: String(page) }).forEach(([k,v]) => { if (v) next.set(k,v); }); return `/products?${next.toString()}`; };

  return <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
    <header className="mb-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-stone-500">The collection</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Shop all products</h1><p className="mt-2 text-sm text-stone-600">Explore the latest products and find your next favorite.</p></header>
    <form action="/products" className="mb-8 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <input name="q" defaultValue={query} placeholder="Search products..." className="h-11 rounded-lg border px-3 text-sm lg:col-span-2" />
      <select name="categoryId" defaultValue={params.categoryId ?? ""} className="h-11 rounded-lg border px-3 text-sm"><option value="">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input name="minPrice" type="number" min="0" step="0.01" defaultValue={params.minPrice} placeholder="Min price" className="h-11 rounded-lg border px-3 text-sm" />
      <input name="maxPrice" type="number" min="0" step="0.01" defaultValue={params.maxPrice} placeholder="Max price" className="h-11 rounded-lg border px-3 text-sm" />
      <select name="sortBy" defaultValue={params.sortBy ?? "createdAt"} className="h-11 rounded-lg border px-3 text-sm"><option value="createdAt">Newest</option><option value="name">Name</option><option value="regularPrice">Price</option></select>
      <input type="hidden" name="sortOrder" value={params.sortOrder ?? "desc"} />
      <button className="h-11 rounded-lg bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-700 lg:col-span-6">Apply filters</button>
    </form>
    {failed ? <p role="alert" className="rounded-xl bg-rose-50 p-5 text-sm text-rose-800">{errorMessage}</p> : items.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center"><h2 className="font-semibold">No products found</h2><p className="mt-2 text-sm text-stone-500">Try changing your search or filters.</p><Link href="/products" className="mt-4 inline-block text-sm font-semibold underline">Clear filters</Link></div> :
      <><p className="mb-4 text-sm text-stone-500">{pagination?.total ?? items.length} product(s)</p><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{items.map(p=><Link key={p.id} href={`/products/${p.id}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="relative aspect-[4/5] bg-stone-100">{p.imageUrl ? <Image src={p.imageUrl} alt={p.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" unoptimized/> : <div className="grid h-full place-items-center text-sm text-stone-400">No image</div>}</div><div className="p-3 sm:p-4"><p className="text-xs text-stone-500">{p.category?.name ?? "Collection"}</p><h2 className="mt-1 line-clamp-2 text-sm font-semibold">{p.name}</h2><div className="mt-2 flex gap-2 text-sm font-semibold">{money(p.salePrice ?? p.regularPrice)}{p.salePrice != null && <span className="font-normal text-stone-400 line-through">{money(p.regularPrice)}</span>}</div></div></Link>)}</div>
      {pagination && pagination.totalPages > 1 && <nav aria-label="Product pages" className="mt-10 flex items-center justify-center gap-4"><Link aria-disabled={pagination.page<=1} className="rounded-lg border px-4 py-2 text-sm" href={makeHref(Math.max(1,pagination.page-1))}>Previous</Link><span className="text-sm text-stone-500">Page {pagination.page} of {pagination.totalPages}</span><Link className="rounded-lg border px-4 py-2 text-sm" href={makeHref(Math.min(pagination.totalPages,pagination.page+1))}>Next</Link></nav>}</>}
  </main>;
}
