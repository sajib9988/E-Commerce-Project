import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

type AuthShellProps = {
  children: ReactNode;
  variant: "login" | "register";
};

export default function AuthShell({ children, variant }: AuthShellProps) {
  const isLogin = variant === "login";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#080d19] px-3 py-4 sm:px-5 lg:p-4">
      <div className="grid w-full max-w-[1160px] grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424] shadow-2xl shadow-black/30 lg:h-[390px] lg:max-h-[calc(100dvh-2rem)] lg:grid-cols-[0.95fr_1.15fr]">
        <section className="relative isolate flex min-h-[260px] flex-col justify-between overflow-hidden px-5 py-5 sm:px-8 sm:py-6 lg:min-h-0 lg:px-7 lg:py-5">
          <div
            className="absolute inset-0 -z-20 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=85')",
            }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#003e4b]/80 via-[#003e4b]/35 to-[#05070d]/95" />

          <div className="relative z-10 flex items-center justify-between gap-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-white" />
              </span>
              <span className="text-xs font-bold tracking-[0.16em] text-white">
                YOUR BRAND
              </span>
            </Link>
            <span className="rounded-full border border-white/20 bg-black/10 px-2.5 py-1 text-[9px] font-semibold tracking-wider text-white/80 backdrop-blur-md">
              PREMIUM
            </span>
          </div>

          <div className="relative z-10 max-w-lg py-4 lg:py-0">
            <p className="mb-2 text-[9px] font-bold tracking-[0.3em] text-sky-300">
              {isLogin ? "WELCOME BACK" : "JOIN THE COMMUNITY"}
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[34px]">
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
            <p className="mt-2 max-w-sm text-xs leading-5 text-white/75">
              {isLogin
                ? "Sign in to explore your collection and enjoy a better shopping experience."
                : "Create your account and discover a collection designed around your unique style."}
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white transition hover:text-sky-300"
            >
              Explore the collection
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/20 pt-2.5">
            <span className="text-[8px] tracking-wider text-white/65">
              DESIGNED FOR EVERYDAY STYLE
            </span>
            <span className="text-[8px] tracking-wider text-white/65">
              EST. 2026
            </span>
          </div>
        </section>

        <section className="flex min-h-0 items-center overflow-y-auto px-5 py-5 sm:px-8 lg:overflow-y-auto lg:px-7 lg:py-3">
          <div className="m-auto w-full max-w-[560px] min-w-0">{children}</div>
        </section>
      </div>
    </main>
  );
}
