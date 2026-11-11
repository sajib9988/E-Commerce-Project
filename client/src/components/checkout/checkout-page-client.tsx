"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ComponentProps, type FormEvent } from "react";
import Image from "next/image";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/providers/cart-store-provider";
import { selectCartSubtotal } from "@/store/cart.store";
import { createCheckoutSession, createPendingOrder } from "@/service/checkout.service";

type ApiError = { success: false; message: string; statusCode?: number };
type UnknownRecord = Record<string, unknown>;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function isApiError(value: unknown): value is ApiError {
  return isRecord(value) && value.success === false && typeof value.message === "string";
}

function extractOrderId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  if (typeof value.orderId === "string") return value.orderId;
  if (typeof value.id === "string") return value.id;
  if (isRecord(value.order)) {
    if (typeof value.order.id === "string") return value.order.id;
    if (typeof value.order.orderId === "string") return value.order.orderId;
  }
  if (isRecord(value.data)) return extractOrderId(value.data);
  return null;
}

type AddressFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const initialAddress: AddressFields = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "United States",
};

export function CheckoutPageClient() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartStore((state) => state.hasHydrated);
  const subtotal = useCartStore(selectCartSubtotal);
  const [address, setAddress] = useState<AddressFields>(initialAddress);
  const [couponCode, setCouponCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKey = useRef<{ signature: string; key: string } | null>(null);

  function updateField(field: keyof AddressFields, value: string) {
    setAddress((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const fullName = `${address.firstName.trim()} ${address.lastName.trim()}`.trim();
    const shippingAddress = {
      firstName: address.firstName.trim(),
      lastName: address.lastName.trim(),
      fullName,
      addressLine1: address.addressLine1.trim(),
      addressLine2: address.addressLine2.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      postalCode: address.postalCode.trim(),
      country: address.country.trim(),
      countryCode: "US",
      phone: address.phone.trim(),
    };
    const checkoutSignature = JSON.stringify({
      items: items.map((item) => ({ productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity })),
      shippingAddress,
      customerEmail: address.email.trim().toLowerCase(),
      couponCode: couponCode.trim().toUpperCase(),
    });
    if (idempotencyKey.current?.signature !== checkoutSignature) idempotencyKey.current = { signature: checkoutSignature, key: crypto.randomUUID() };

    try {
      const orderResult = await createPendingOrder({
        items: items.map((item) => ({
          productId: item.productId,
          ...(item.variantId ? { variantId: item.variantId } : {}),
          quantity: item.quantity,
        })),
        shippingAddress,
        billingAddress: shippingAddress,
        customerEmail: address.email.trim(),
        customerName: fullName,
        customerPhone: address.phone.trim(),
        ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
        idempotencyKey: idempotencyKey.current.key,
      });

      if (isApiError(orderResult)) {
        if (orderResult.statusCode === 401) {
          router.replace(`/login?next=${encodeURIComponent("/checkout")}`);
          return;
        }
        setErrorMessage(orderResult.message);
        return;
      }

      const orderId = extractOrderId(orderResult);
      if (!orderId) {
        setErrorMessage("The order was created, but the server response did not include an order ID. Please contact support before retrying.");
        return;
      }

      const paymentResult = await createCheckoutSession(orderId);
      if (isApiError(paymentResult)) {
        setErrorMessage(paymentResult.message);
        return;
      }

      if (!paymentResult.checkoutUrl) {
        setErrorMessage("Stripe checkout URL was not returned by the server.");
        return;
      }

      window.location.assign(paymentResult.checkoutUrl);
    } catch {
      setErrorMessage("Unable to start checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!hasHydrated) {
    return <main className="mx-auto min-h-[60vh] max-w-6xl px-4 py-16"><div className="h-40 animate-pulse rounded-2xl bg-stone-100" /></main>;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold text-stone-950">Your cart is empty</h1>
        <p className="mt-3 text-sm text-stone-600">Add products to your cart before checking out.</p>
        <Link href="/products" className="mt-7 inline-flex h-10 items-center justify-center rounded-full bg-stone-950 px-7 text-sm font-medium text-white transition hover:bg-stone-800">Browse products</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-950">
        <ArrowLeft size={16} /> Back to cart
      </Link>
      <div className="mt-7 border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Almost yours</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-stone-600">Enter your shipping details. You’ll complete payment securely on Stripe.</p>
      </div>

      <div className="grid gap-10 py-8 lg:grid-cols-[1fr_360px]">
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-950">Contact information</h2>
              <p className="mt-1 text-sm text-stone-500">We’ll use this email for your order updates.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={address.firstName} onChange={(value) => updateField("firstName", value)} required autoComplete="given-name" />
              <Field label="Last name" value={address.lastName} onChange={(value) => updateField("lastName", value)} required autoComplete="family-name" />
              <Field label="Email address" type="email" value={address.email} onChange={(value) => updateField("email", value)} required autoComplete="email" className="sm:col-span-2" />
              <Field label="Phone number" type="tel" value={address.phone} onChange={(value) => updateField("phone", value)} required autoComplete="tel" className="sm:col-span-2" />
            </div>
          </section>

          <section className="space-y-4 border-t border-stone-200 pt-7">
            <div>
              <h2 className="text-lg font-semibold text-stone-950">Shipping address</h2>
              <p className="mt-1 text-sm text-stone-500">Enter the address where your order should be delivered.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address line 1" value={address.addressLine1} onChange={(value) => updateField("addressLine1", value)} required autoComplete="address-line1" className="sm:col-span-2" />
              <Field label="Apartment, suite, etc. (optional)" value={address.addressLine2} onChange={(value) => updateField("addressLine2", value)} autoComplete="address-line2" className="sm:col-span-2" />
              <Field label="City" value={address.city} onChange={(value) => updateField("city", value)} required autoComplete="address-level2" />
              <Field label="State" value={address.state} onChange={(value) => updateField("state", value)} required autoComplete="address-level1" />
              <Field label="ZIP / Postal code" value={address.postalCode} onChange={(value) => updateField("postalCode", value)} required autoComplete="postal-code" />
              <Field label="Country" value={address.country} onChange={(value) => updateField("country", value)} required autoComplete="country-name" disabled />
            </div>
          </section>

          <section className="space-y-3 border-t border-stone-200 pt-7">
            <label htmlFor="coupon" className="text-sm font-medium text-stone-900">Discount code <span className="font-normal text-stone-400">(optional)</span></label>
            <Input id="coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="h-11 max-w-sm rounded-xl bg-white px-3" />
            <p className="text-xs text-stone-500">The server validates coupon eligibility and discount during order creation.</p>
          </section>

          <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-4 text-xs leading-5 text-stone-600">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-stone-700" />
            Your order total, product availability and pricing are verified by our server. Cart prices are estimates only.
          </div>

          {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
          <Button type="submit" disabled={isSubmitting || items.length === 0} className="h-12 w-full rounded-full text-sm sm:w-auto sm:min-w-64">
            {isSubmitting ? "Preparing secure checkout..." : <><LockKeyhole size={16} /> Continue to secure payment</>}
          </Button>
        </form>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-stone-50 p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-950">Order summary</h2>
          <div className="mt-5 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-stone-200">
                  {item.imageUrl ? <Image src={item.imageUrl} alt={item.name} fill sizes="64px" className="object-cover" unoptimized /> : null}
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-stone-900 text-[10px] font-semibold text-white">{item.quantity}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-stone-900">{item.name}</p>
                  <p className="mt-1 text-xs text-stone-500">{money.format(item.unitPrice)} each</p>
                </div>
                <p className="text-sm font-medium tabular-nums text-stone-900">{money.format(item.unitPrice * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="my-5 border-t border-stone-200" />
          <div className="flex justify-between text-sm text-stone-600"><span>Subtotal</span><span className="font-medium tabular-nums text-stone-950">{money.format(subtotal)}</span></div>
          <p className="mt-3 text-xs leading-5 text-stone-500">Shipping, taxes and discounts are calculated and confirmed by the backend before payment.</p>
          <div className="mt-5 flex items-center justify-between border-t border-stone-200 pt-5 text-base font-semibold text-stone-950"><span>Estimated total</span><span className="tabular-nums">{money.format(subtotal)}</span></div>
        </aside>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange">) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-stone-800">{label}</label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl bg-white px-3" {...props} />
    </div>
  );
}
