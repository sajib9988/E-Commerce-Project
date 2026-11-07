"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function CustomerAuthRedirect() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const query = searchParams.toString();
    const next = pathname + (query ? `?${query}` : "");
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [pathname, router, searchParams]);

  return null;
}
