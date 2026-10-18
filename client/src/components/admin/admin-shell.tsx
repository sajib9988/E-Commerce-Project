"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, BarChart3, Bell, ChevronDown, CreditCard, LayoutDashboard,
  Menu, Package, Search, Settings, ShoppingBag, ShoppingCart, Tag,
  Users, X, Image as ImageIcon, FileText, ShieldCheck
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Collections", href: "/admin/collections", icon: ShoppingBag },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Coupons", href: "/admin/coupons", icon: Tag },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "CMS Pages", href: "/admin/cms", icon: FileText },
  { label: "Media Library", href: "/admin/media", icon: ImageIcon },
];
const management = [
  { label: "Users & Roles", href: "/admin/users", icon: ShieldCheck },
  { label: "Store Settings", href: "/admin/settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Preferences</p>
      {management.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            <Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200 bg-white px-4 py-5 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShoppingBag size={21}/></span>
          <span><span className="block text-base font-bold tracking-tight">Commerce</span><span className="block text-xs text-slate-500">Store administration</span></span>
        </Link>
        <nav className="flex-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          <NavLinks />
        </nav>
        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center gap-2"><Activity size={16} className="text-emerald-600"/><span className="text-xs font-semibold">Store overview</span></div>
          <p className="mt-1 text-xs leading-5 text-slate-500">Connect the backend to display live store data.</p>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-40 lg:hidden">
        <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/40" />
        <aside className="absolute inset-y-0 left-0 flex w-[min(85vw,300px)] flex-col bg-white px-4 py-5 shadow-xl">
          <div className="mb-7 flex items-center justify-between px-2">
            <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShoppingBag size={21}/></span>
              <span><span className="block font-bold">Commerce</span><span className="block text-xs text-slate-500">Admin workspace</span></span>
            </Link>
            <button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={20}/></button>
          </div>
          <nav className="flex-1 overflow-y-auto"><NavLinks onNavigate={() => setMobileOpen(false)} /></nav>
        </aside>
      </div>}

      <div className="min-w-0 lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 xl:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 lg:hidden"><Menu size={20}/></button>
            <div className="hidden items-center gap-2 text-sm text-slate-400 sm:flex"><span>Workspace</span><span>/</span><span className="font-semibold text-slate-800">Admin</span></div>
            <div className="relative ml-1 hidden md:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search dashboard" placeholder="Search anything..." className="h-10 w-56 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white xl:w-72"/></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button aria-label="Notifications" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"><Bell size={18}/><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white"/></button>
            <div className="hidden h-8 w-px bg-slate-200 sm:block"/>
            <button className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">A</span>
              <span className="hidden sm:block"><span className="block text-sm font-semibold">Store Admin</span><span className="block text-xs text-slate-500">Administrator</span></span>
              <ChevronDown size={15} className="hidden text-slate-400 sm:block"/>
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 xl:p-9">{children}</main>
      </div>
    </div>
  );
}
