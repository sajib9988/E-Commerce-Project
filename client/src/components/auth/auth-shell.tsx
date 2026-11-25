import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
  variant: "login" | "register";
};

export default function AuthShell({
  children,
  variant,
}: AuthShellProps) {
  const isLogin = variant === "login";

  return (
 <main className="flex min-h-screen items-center justify-center bg-[#080d19] px-4 py-8">
     <div className="grid w-full max-w-[860px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424] shadow-2xl shadow-black/30 lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr]">

        {/* Left: Fashion Image */}
        <section className="relative flex min-h-[210px] flex-col justify-between overflow-hidden bg-[#063b46] p-7 sm:min-h-[240px] sm:p-10 lg:min-h-[520px]">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=85')",
            }}
          />

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#003e4b]/80 via-[#003e4b]/35 to-[#05070d]/95" />

          {/* Brand */}
          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur-md">
                <Sparkles className="h-5 w-5 text-white" />
              </span>

              <span className="text-sm font-bold tracking-[0.18em] text-white">
                YOUR BRAND
              </span>
            </Link>

            <span className="rounded-full border border-white/20 bg-black/10 px-3 py-2 text-[10px] font-semibold tracking-wider text-white/80 backdrop-blur-md">
              PREMIUM COLLECTION
            </span>
          </div>

          {/* Editorial Content */}
          <div className="relative z-10 max-w-lg py-7 lg:py-0">
            <p className="mb-4 text-xs font-bold tracking-[0.3em] text-sky-300">
              {isLogin ? "WELCOME BACK" : "JOIN THE COMMUNITY"}
            </p>

            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              {isLogin ? (
                <>
                  Style that
                  <br />
                  speaks for
                  <br />
                  you.
                </>
              ) : (
                <>
                  Your style.
                  <br />
                  Your identity.
                </>
              )}
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
              {isLogin
                ? "Sign in to explore your collection and enjoy a better shopping experience."
                : "Create your account and discover a collection designed around your unique style."}
            </p>

            <Link
              href="/"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-white transition hover:text-sky-300"
            >
              Explore the collection
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-4">
            <span className="text-[9px] tracking-wider text-white/65">
              DESIGNED FOR EVERYDAY STYLE
            </span>

            <span className="text-[9px] tracking-wider text-white/65">
              EST. 2026
            </span>
          </div>
        </section>

        {/* Right: Form */}
        <section className="flex items-center justify-center px-6 py-7 sm:px-8 lg:px-10 lg:py-8">
          <div className="w-full max-w-[440px]">

            {/* Form Content */}
            {children}

          </div>
        </section>
      </div>
    </main>
  );
}