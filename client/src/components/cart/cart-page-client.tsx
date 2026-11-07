"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  selectCartSubtotal,
} from "@/store/cart.store";
import { useCartStore } from "@/providers/cart-store-provider";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function CartPageClient() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const subtotal = useCartStore(selectCartSubtotal);
  const increaseItem = useCartStore((state) => state.increaseItem);
  const decreaseItem = useCartStore((state) => state.decreaseItem);
  const removeItem = useCartStore((state) => state.removeItem);

  if (!hasHydrated) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-48 rounded bg-stone-200" />
          <div className="h-28 rounded-2xl bg-stone-100" />
          <div className="h-28 rounded-2xl bg-stone-100" />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-6xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-stone-100">
          <ShoppingBag className="size-9 text-stone-500" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Your cart</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">Your bag is empty</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">
          Looks like you haven’t added anything yet. Explore the shop and find something you love.
        </p>
        <Button asChild className="mt-8 h-11 rounded-full px-7">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link href="/products" className="inline-flex items-center gap-2 text-sm text-stone-500 transition hover:text-stone-950">
        <ArrowLeft size={16} /> Continue shopping
      </Link>

      <div className="mt-7 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Your selection</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Shopping cart</h1>
        </div>
        <p className="text-sm text-stone-500">{items.reduce((count, item) => count + item.quantity, 0)} items</p>
      </div>

      <div className="grid gap-10 py-8 lg:grid-cols-[1fr_340px]">
        <section aria-label="Cart items" className="divide-y divide-stone-200">
          {items.map((item) => (
            <article key={item.id} className="flex gap-4 py-6 first:pt-0">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:size-32">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill sizes="(max-width: 640px) 96px, 128px" className="object-cover" unoptimized />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-stone-400">No image</div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row">
                <div className="min-w-0">
                  <h2 className="font-medium text-stone-950">{item.name}</h2>
                  {item.variantId && <p className="mt-1 text-xs text-stone-500">Variant: {item.variantId}</p>}
                  <p className="mt-2 text-sm text-stone-600">{money.format(item.unitPrice)}</p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-stone-500 transition hover:text-red-600"
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>

                <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end sm:justify-between">
                  <div className="inline-flex h-9 items-center rounded-full border border-stone-200">
                    <button type="button" onClick={() => decreaseItem(item.id)} aria-label={`Decrease ${item.name} quantity`} className="grid size-9 place-items-center text-stone-600 hover:text-stone-950">
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-sm tabular-nums">{item.quantity}</span>
                    <button type="button" onClick={() => increaseItem(item.id)} aria-label={`Increase ${item.name} quantity`} className="grid size-9 place-items-center text-stone-600 hover:text-stone-950">
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="font-medium tabular-nums text-stone-950">{money.format(item.unitPrice * item.quantity)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h2 className="text-lg font-semibold text-stone-950">Order summary</h2>
          <div className="mt-6 flex justify-between text-sm text-stone-600">
            <span>Subtotal</span><span className="font-medium tabular-nums text-stone-950">{money.format(subtotal)}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">Shipping, discounts and final taxes are confirmed during checkout. Prices shown here are display estimates; the server calculates the final order total.</p>
          <div className="my-6 border-t border-stone-200" />
          <div className="flex justify-between text-base font-semibold text-stone-950">
            <span>Estimated total</span><span className="tabular-nums">{money.format(subtotal)}</span>
          </div>
          <Button asChild className="mt-6 h-12 w-full rounded-full">
            <Link href="/checkout">Continue to checkout</Link>
          </Button>
          <p className="mt-4 text-center text-[11px] leading-5 text-stone-500">Secure payment powered by Stripe</p>
        </aside>
      </div>
    </main>
  );
}
