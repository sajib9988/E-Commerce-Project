"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function StorefrontNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // The storefront navigation must not appear inside the admin workspace.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/95 text-stone-900 backdrop-blur">
      <div className="flex min-h-9 items-center justify-center gap-2 bg-stone-950 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-white sm:text-xs">
        <span>Complimentary shipping on orders over $75</span>
        <ArrowRight aria-hidden="true" size={13} />
      </div>

      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-stone-100 md:hidden"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <Link
            href="/"
            aria-label="Commerce home"
            className="text-xl font-black tracking-[0.16em] sm:text-2xl"
          >
            COMMERCE<span className="text-stone-400">.</span>
          </Link>
        </div>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative py-2 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-stone-900 after:transition-transform ${active ? "font-semibold text-stone-950 after:scale-x-100" : "text-stone-500 hover:text-stone-950 after:scale-x-0 hover:after:scale-x-100"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <form
            action="/products"
            role="search"
            className="hidden items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 lg:flex"
          >
            <Search aria-hidden="true" size={16} className="text-stone-500" />
            <input
              aria-label="Search products"
              name="q"
              placeholder="Search products"
              className="w-32 bg-transparent text-sm outline-none placeholder:text-stone-400 xl:w-40"
            />
          </form>

          <Link
            href="/account"
            aria-label="Your account"
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-stone-100"
          >
            <UserRound size={20} strokeWidth={1.7} />
          </Link>

          <Link
            href="/cart"
            aria-label="Shopping bag"
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-stone-100"
          >
            <ShoppingBag size={20} strokeWidth={1.7} />
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-stone-200 bg-white px-4 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto flex max-w-[1440px] flex-col">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3 py-3 text-sm transition ${active ? "bg-stone-100 font-semibold text-stone-950" : "text-stone-600 hover:bg-stone-50"}`}
                >
                  {link.label}
                </Link>
              );
            })}
            <form action="/products" role="search" className="mt-3 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-3">
              <Search aria-hidden="true" size={17} className="text-stone-500" />
              <input
                aria-label="Search products"
                name="q"
                placeholder="Search products"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
