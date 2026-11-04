import { StorefrontNavbar } from "@/components/storefront/storefront-navbar";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <StorefrontNavbar />
    {children}
  </>;
}
