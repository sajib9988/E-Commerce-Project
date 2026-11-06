import Link from "next/link";

export const instant = false;

export default function CustomerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <nav aria-label="Customer account navigation" className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/account/reviews" className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-950">My reviews</Link>
          <Link href="/account/coupons" className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-950">Available coupons</Link>
        </div>
      </nav>
      {children}
    </main>
  );
}
