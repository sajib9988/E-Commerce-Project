import { StorefrontNavbar } from "@/components/storefront/storefront-navbar";
import { CartStoreProvider } from "@/providers/cart-store-provider";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartStoreProvider>
      <StorefrontNavbar />
      {children}
    </CartStoreProvider>
  );
}
