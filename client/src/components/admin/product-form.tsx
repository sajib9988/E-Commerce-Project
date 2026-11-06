"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { ArrowLeft, ImagePlus, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { createProduct, updateProduct } from "@/service/product.service";

type Category = {
  id: string;
  name: string;
  subcategories?: Array<{ id: string; name: string }>;
};
type Collection = { id: string; name: string };
type ProductRecord = {
  id: string;
  name: string;
  description?: string | null;
  regularPrice: number | string;
  salePrice?: number | string | null;
  brand?: string | null;
  sku?: string | null;
  apliiqDesignSku?: string | null;
  stockQuantity?: number;
  isActive?: boolean;
  categoryId: string;
  subcategoryId: string;
  imageUrl?: string | null;
  sizes?: string[];
  collections?: Array<{ collectionId?: string; collection?: { id: string } }>;
};

const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required").max(150),
  description: z.string().max(5000, "Description must be 5000 characters or less"),
  regularPrice: z.string().trim().min(1, "Regular price is required").refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, "Regular price cannot be negative"),
  salePrice: z.string().optional(),
  brand: z.string().max(100).optional(),
  sku: z.string().max(150).optional(),
  apliiqDesignSku: z.string().max(150).optional(),
  stockQuantity: z.string().regex(/^\d+$/, "Stock must be a whole number greater than or equal to zero"),
  categoryId: z.string().min(1, "Select a category"),
  subcategoryId: z.string().min(1, "Select a subcategory"),
  collectionIds: z.array(z.string()),
  sizesText: z.string(),
  isActive: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.salePrice?.trim()) {
    const salePrice = Number(data.salePrice);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Enter a valid sale price" });
    } else if (salePrice >= Number(data.regularPrice)) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than regular price" });
    }
  }
});

type ProductFormValues = z.infer<typeof productSchema>;

function getErrorMessage(result: unknown): string | null {
  if (typeof result === "object" && result !== null && "success" in result && result.success === false) {
    return "message" in result ? String(result.message) : "The request failed.";
  }
  return null;
}

export function ProductForm({
  categories,
  collections,
  product,
}: {
  categories: Category[];
  collections: Collection[];
  product?: ProductRecord;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl ?? null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      regularPrice: String(product?.regularPrice ?? 0),
      salePrice: product?.salePrice == null ? "" : String(product.salePrice),
      brand: product?.brand ?? "",
      sku: product?.sku ?? "",
      apliiqDesignSku: product?.apliiqDesignSku ?? "",
      stockQuantity: String(product?.stockQuantity ?? 0),
      categoryId: product?.categoryId ?? "",
      subcategoryId: product?.subcategoryId ?? "",
      collectionIds: product?.collections?.map((item) => item.collectionId ?? item.collection?.id ?? "").filter(Boolean) ?? [],
      sizesText: product?.sizes?.join(", ") ?? "",
      isActive: product?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (!imagePreview?.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const selectedCategoryId = useWatch({ control: form.control, name: "categoryId" });
  const selectedSubcategories = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId)?.subcategories ?? [],
    [categories, selectedCategoryId],
  );

  function handleImageChange(file?: File) {
    setImageFile(file ?? null);
    if (file) setImagePreview(URL.createObjectURL(file));
    else setImagePreview(product?.imageUrl ?? null);
  }

  async function onSubmit(values: ProductFormValues) {
    if (!isEdit && !imageFile) {
      toast.error("Please select a product image.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("name", values.name.trim());
    formData.append("description", values.description);
    formData.append("regularPrice", String(Number(values.regularPrice)));
    formData.append("salePrice", values.salePrice?.trim() ? String(Number(values.salePrice)) : "null");
    formData.append("brand", (values.brand ?? "").trim());
    formData.append("sku", (values.sku ?? "").trim());
    formData.append("apliiqDesignSku", (values.apliiqDesignSku ?? "").trim());
    formData.append("stockQuantity", String(Number(values.stockQuantity)));
    formData.append("categoryId", values.categoryId);
    formData.append("subcategoryId", values.subcategoryId);
    formData.append("collectionIds", JSON.stringify(values.collectionIds));
    const sizes = values.sizesText.split(",").map((size) => size.trim()).filter(Boolean);
    formData.append("sizes", JSON.stringify(sizes));
    formData.append("isActive", String(values.isActive));
    if (imageFile) formData.append("image", imageFile);

    try {
      const result = isEdit && product
        ? await updateProduct(product.id, formData)
        : await createProduct(formData);
      const error = getErrorMessage(result);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success(isEdit ? "Product updated successfully." : "Product created successfully.");
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-950">Basic information</h2>
                <p className="mt-1 text-sm text-slate-500">Add the product name and storefront description.</p>
              </div>
              <div className="space-y-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product name *</FormLabel>
                    <FormControl><Input {...field} placeholder="Everyday Classic T-Shirt" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea {...field} rows={5} placeholder="Describe the product..." /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="brand" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl><Input {...field} placeholder="Brand name" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-950">Pricing and inventory</h2>
                <p className="mt-1 text-sm text-slate-500">Set the selling price and initial stock information.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="regularPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regular price (USD) *</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" step="0.01" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="salePrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale price (USD)</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" step="0.01" placeholder="Optional" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial stock quantity</FormLabel>
                    <FormControl><Input {...field} type="number" min="0" step="1" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store SKU</FormLabel>
                    <FormControl><Input {...field} placeholder="STORE-TSHIRT-001" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="apliiqDesignSku" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Apliiq design SKU</FormLabel>
                    <FormControl><Input {...field} placeholder="Apliiq sellable design SKU" className="h-10" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-950">Organization</h2>
                <p className="mt-1 text-sm text-slate-500">Choose the category, subcategory and collections.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <FormControl>
                      <select {...field} onChange={(event) => { field.onChange(event); form.setValue("subcategoryId", "", { shouldValidate: true }); }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Select category</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="subcategoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory *</FormLabel>
                    <FormControl>
                      <select {...field} disabled={!selectedCategoryId || selectedSubcategories.length === 0} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                        <option value="">Select subcategory</option>
                        {selectedSubcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="collectionIds" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Collections</FormLabel>
                    <FormControl>
                      <select multiple value={field.value} onChange={(event) => field.onChange(Array.from(event.target.selectedOptions, (option) => option.value))} className="min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                      </select>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Hold Ctrl (Windows) or Command (Mac) to select multiple collections.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sizesText" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Available sizes</FormLabel>
                    <FormControl><Input {...field} placeholder="XS, S, M, L, XL" className="h-10" /></FormControl>
                    <p className="text-xs text-muted-foreground">Comma-separated labels. Variant-level size and stock management will be handled in Variant Management.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-950">Product image</h2>
                <p className="mt-1 text-sm text-slate-500">{isEdit ? "Upload a new image to replace the current one." : "A product image is required."}</p>
              </div>
              <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center hover:bg-slate-100">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="Product preview" className="h-52 w-full object-contain p-3" />
                ) : (
                  <span className="flex flex-col items-center gap-2 p-5 text-sm text-slate-500"><ImagePlus className="size-8" />Choose product image</span>
                )}
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => handleImageChange(event.target.files?.[0])} />
              </label>
              {imageFile && <p className="mt-2 truncate text-xs text-slate-500">{imageFile.name}</p>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Product status</h2>
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="mt-4 flex items-center justify-between">
                  <div>
                    <FormLabel>Active on storefront</FormLabel>
                    <p className="mt-1 text-xs text-slate-500">Inactive products are hidden from customers.</p>
                  </div>
                  <FormControl>
                    <input type="checkbox" checked={field.value} onChange={field.onChange} className="size-5 accent-slate-900" />
                  </FormControl>
                </FormItem>
              )} />
            </section>

            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isLoading} className="h-10 w-full">
                {isLoading ? <Loader2 className="animate-spin" /> : <Save />}
                {isEdit ? "Save changes" : "Create product"}
              </Button>
              <Button type="button" variant="outline" disabled={isLoading} onClick={() => router.push("/admin/products")} className="h-10 w-full">
                <ArrowLeft /> Cancel
              </Button>
            </div>
          </aside>
        </div>
      </form>
    </Form>
  );
}
