import "server-only";

type Category = {
  id: string;
  name: string;
  slug: string;
  subcategories?: Array<{ id: string; name: string; slug: string }>;
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export async function getPublicCategories(): Promise<Category[]> {
  if (!BASE_URL) return [];

  try {
    const response = await fetch(`${BASE_URL.replace(/\\/+$/, "")}/categories`, {
      next: { revalidate: 300 },
    });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? data as Category[] : [];
  } catch (error) {
    console.error("Could not load product categories:", error);
    return [];
  }
}
