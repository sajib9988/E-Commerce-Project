import Link from "next/link";

const featuredLinks = [
  {
    title: "Shop products",
    description: "Explore the complete product catalog and find your next favorite.",
    href: "/products",
    label: "Browse products",
  },
  {
    title: "Explore collections",
    description: "Discover products grouped into curated collections.",
    href: "/collections",
    label: "View collections",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1">
      <section className="relative isolate overflow-hidden bg-zinc-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-700 via-zinc-950 to-black"
        />
        <div className="mx-auto grid min-h-[560px] max-w-7xl items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-300">
              Everyday essentials
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
              Find the pieces that feel like you.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Explore thoughtfully selected products and collections, with a
              simple shopping experience from discovery to checkout.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
              >
                Shop products
              </Link>
              <Link
                href="/collections"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/40 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Explore collections
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex lg:justify-end">
            <div className="flex aspect-[4/5] w-full max-w-sm flex-col justify-between rounded-[2rem] border border-white/15 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
              <span className="text-xs uppercase tracking-[0.25em] text-zinc-300">
                Your next favorite
              </span>
              <div>
                <div className="mb-5 h-px w-16 bg-white/60" />
                <p className="text-3xl font-medium leading-tight">
                  Good design.
                  <br />
                  Everyday comfort.
                </p>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  Browse the catalog to see current products, available
                  variants, and live prices.
                </p>
              </div>
              <span className="text-xs text-zinc-400">Discover something new</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-6 py-16 sm:px-10 md:grid-cols-2 lg:px-12">
        {featuredLinks.map((item) => (
          <article
            key={item.href}
            className="rounded-3xl border border-zinc-200 bg-white p-8 transition hover:border-zinc-400"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
              {item.title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-zinc-600">
              {item.description}
            </p>
            <Link
              href={item.href}
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-zinc-950 underline underline-offset-4"
            >
              {item.label}
              <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
