"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { logoutUser, getMe } from "@/service/auth.service";
import { useCartStore } from "@/providers/cart-store-provider";
import { selectCartItemCount } from "@/store/cart.store";

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "Collections", href: "/collections" },
  { label: "Contact", href: "/contact" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

function getUserRole(user: unknown) {
  if (!user || typeof user !== "object") return "";
  const value = user as Record<string, any>;
  return String(
    value.role ??
      value.data?.role ??
      value.user?.role ??
      value.data?.user?.role ??
      "",
  ).toUpperCase();
}

export function StorefrontNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState("U");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [dashboardHref, setDashboardHref] = useState("/dashboard");
  const cartItemCount = useCartStore(selectCartItemCount);
  const cartHasHydrated = useCartStore((state) => state.hasHydrated);

  useEffect(() => {
    let active = true;

    getMe()
      .then((user) => {
        if (!active) return;
        const authenticated = Boolean(user);
        const account = user && typeof user === "object" ? ((user as any).data ?? (user as any).user ?? user) : null;
        const role = getUserRole(user);
        setAvatarUrl(account?.avatarUrl ?? null);
        setUserInitials(String(account?.name ?? "U").trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "U");
        setIsAuthenticated(authenticated);
        setDashboardHref(
          role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" :  "/account",
        );
      })
      .catch(() => {
        if (active) setIsAuthenticated(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logoutUser();
      setIsAuthenticated(false);
      setAccountOpen(false);
      setMobileOpen(false);
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Storefront logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/95 text-stone-900 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            aria-controls="storefront-mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-stone-100 md:hidden"
          >
            {mobileOpen ? <X size={21} /> : <Menu size={21} />}
          </button>

          <Link href="/" aria-label="Commerce home" className="text-xl font-black tracking-[0.16em] sm:text-2xl">
            COMMERCE<span className="text-stone-400">.</span>
          </Link>
        </div>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          {links.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={"relative py-2 text-sm transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:bg-stone-900 after:transition-transform " + (
                  active
                    ? "font-semibold text-stone-950 after:scale-x-100"
                    : "text-stone-500 hover:text-stone-950 after:scale-x-0 hover:after:scale-x-100"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <form action="/products" role="search" className="hidden items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 lg:flex">
            <Search aria-hidden="true" size={16} className="text-stone-500" />
            <input aria-label="Search products" name="q" placeholder="Search products" className="w-32 bg-transparent text-sm outline-none placeholder:text-stone-400 xl:w-40" />
          </form>

          <Link
            href="/cart"
            aria-label={cartHasHydrated ? "Shopping cart with " + cartItemCount + " items" : "Shopping cart"}
            className="relative inline-flex size-10 items-center justify-center rounded-full transition hover:bg-stone-100"
          >
            <ShoppingBag size={20} strokeWidth={1.7} />
            {cartHasHydrated && cartItemCount > 0 && (
              <span className="absolute right-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-stone-950 px-1 text-[10px] font-semibold leading-none text-white">
                {cartItemCount > 99 ? "99+" : cartItemCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                type="button"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((open) => !open)}
                className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-white text-xs font-semibold transition hover:bg-stone-100"
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <span>{userInitials}</span>}
              </button>
              {accountOpen && (
                <div role="menu" className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">
                  <Link
                    role="menuitem"
                    href={dashboardHref}
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-stone-700 transition hover:bg-stone-100"
                  >
                    <LayoutDashboard size={17} />
                    {dashboardHref === "/admin" ? "Admin Dashboard" : "Dashboard"}
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    <LogOut size={17} />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/account"
              aria-label="Login to your account"
              className="inline-flex size-10 items-center justify-center rounded-full transition hover:bg-stone-100"
            >
              <UserRound size={20} strokeWidth={1.7} />
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div id="storefront-mobile-navigation" className="border-t border-stone-200 bg-white px-4 pb-5 pt-3 md:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto flex max-w-[1440px] flex-col">
            {links.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={"rounded-xl px-3 py-3 text-sm transition " + (
                    active ? "bg-stone-100 font-semibold text-stone-950" : "text-stone-600 hover:bg-stone-50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}

            {isAuthenticated ? (
              <div className="mt-2 rounded-xl border border-stone-200 p-2">
                <button
                  type="button"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium text-stone-800 hover:bg-stone-50"
                >
                  <span className="flex items-center gap-2"><UserRound size={17} />Account</span>
                  <ChevronDown size={16} className={accountOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {accountOpen && (
                  <div className="mt-1 border-t border-stone-100 pt-1">
                    <Link
                      href={dashboardHref}
                      onClick={() => { setAccountOpen(false); setMobileOpen(false); }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-stone-700 hover:bg-stone-50"
                    >
                      <LayoutDashboard size={17} />
                      {dashboardHref === "/admin" ? "Admin Dashboard" : "Dashboard"}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <LogOut size={17} />
                      {isLoggingOut ? "Logging out..." : "Logout"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="mt-2 flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <UserRound size={17} />
                Account / Login
              </Link>
            )}

            <form action="/products" role="search" className="mt-3 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-3">
              <Search aria-hidden="true" size={17} className="text-stone-500" />
              <input aria-label="Search products" name="q" placeholder="Search products" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" />
            </form>
          </nav>
        </div>
      )}
    </header>
  );
}
