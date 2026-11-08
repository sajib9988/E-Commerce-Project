import { StorefrontNavbar } from "@/components/storefront/storefront-navbar";
import { CartStoreProvider } from "@/providers/cart-store-provider";
import { SignupDiscountPopup } from "@/components/storefront/signup-discount-popup";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartStoreProvider>
      <StorefrontNavbar />
      <SignupDiscountPopup />
      {children}
    </CartStoreProvider>
  );
}
