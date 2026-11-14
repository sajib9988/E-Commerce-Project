import { Suspense } from "react";
import { CustomerAccountNav } from "@/components/customer/customer-account-nav";
import { StorefrontNavbar } from "@/components/storefront/storefront-navbar";
import { CartStoreProvider } from "@/providers/cart-store-provider";
import CustomerAuthGate from "./customer-auth-gate";

export const instant = false;

export default function CustomerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading account...
        </div>
      }
    >
      <CustomerAuthGate>
        <CartStoreProvider>
          <StorefrontNavbar />
          <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 lg:py-10">
              <CustomerAccountNav />
              <section className="min-w-0">{children}</section>
            </div>
          </main>
        </CartStoreProvider>
      </CustomerAuthGate>
    </Suspense>
  );
}
