
import type { ReactNode } from "react";
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
    <main className="relative min-h-screen overflow-hidden bg-[#080D18] px-4 py-5 text-white sm:px-6 lg:px-10 lg:py-8">

      {/* Background glow */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px]" />

      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />

      {/* Main container */}
      <div className="relative mx-auto grid min-h-[calc(100svh-40px)] max-w-[1400px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.025] shadow-2xl lg:min-h-[calc(100svh-64px)] lg:grid-cols-2 lg:rounded-[36px]">

        {/* LEFT: Fashion editorial */}
        <section
          className="relative flex min-h-[230px] flex-col justify-between overflow-hidden bg-cover bg-center p-6 sm:min-h-[300px] sm:p-9 lg:min-h-[720px] lg:p-12"
          style={{
            backgroundImage: `
              linear-gradient(
                180deg,
                rgba(5,10,20,0.15),
                rgba(5,10,20,0.85)
              ),
              url("https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=85")
            `,
          }}
        >

          {/* Image overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950/30 via-transparent to-black/60" />

          {/* Brand */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/10 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
              </div>

              <span className="text-sm font-bold tracking-[0.2em]">
                YOUR BRAND
              </span>
            </div>

            <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[10px] tracking-widest text-white/80 backdrop-blur-xl">
              PREMIUM COLLECTION
            </span>
          </div>

          {/* Editorial content */}
          <div className="relative z-10 max-w-lg">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-200 sm:text-xs">
              {isLogin
                ? "WELCOME BACK"
                : "JOIN THE COMMUNITY"}
            </p>

            <h1 className="max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-6xl">
              {isLogin
                ? "Style that speaks for you."
                : "Your style. Your identity."}
            </h1>

            <p className="mt-4 max-w-sm text-xs leading-6 text-white/70 sm:text-sm">
              {isLogin
                ? "Discover your favorites, explore new collections and enjoy a seamless shopping experience."
                : "Create your account and discover a collection designed around your unique style."}
            </p>

            <div className="mt-6 hidden items-center gap-2 text-xs font-medium text-white/80 sm:flex">
              Explore the collection
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Bottom information */}
          <div className="relative z-10 hidden items-center justify-between border-t border-white/20 pt-5 text-[10px] tracking-widest text-white/60 lg:flex">
            <span>DESIGNED FOR EVERYDAY STYLE</span>
            <span>EST. 2026</span>
          </div>
        </section>

        {/* RIGHT: Authentication */}
        <section className="relative flex items-center justify-center bg-[#0B1220]/90 px-4 py-10 sm:px-8 lg:px-12 xl:px-16">

          {/* Inner glow */}
          <div className="pointer-events-none absolute right-0 top-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />

          <div className="relative z-10 w-full max-w-[440px]">

            {children}

            <p className="mt-8 text-center text-[10px] tracking-wide text-white/35">
              © 2026 YOUR BRAND. ALL RIGHTS RESERVED.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
