"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRound, LayoutDashboard, Package, CreditCard, RotateCcw, ShieldCheck, Star, Ticket, LogOut } from "lucide-react";
import { logoutUser } from "@/service/auth.service";

const links = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "My orders", icon: Package },
  { href: "/account/payments", label: "Payments", icon: CreditCard },
  { href: "/account/refunds", label: "Refunds", icon: RotateCcw },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
  { href: "/account/reviews", label: "My reviews", icon: Star },
  { href: "/account/coupons", label: "Coupons", icon: Ticket },
];

export function CustomerAccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logoutUser();
    router.replace("/login");
    router.refresh();
  }
  return (
    <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
      <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-[.16em] text-stone-400">My account</p>
      <nav aria-label="Customer account navigation" className="grid gap-1">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"}`}>
            <Icon size={17} strokeWidth={1.8}/><span>{label}</span>
          </Link>;
        })}
      </nav>
      <div className="mt-3 border-t border-stone-100 pt-3">
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50">
          <LogOut size={17} strokeWidth={1.8} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
