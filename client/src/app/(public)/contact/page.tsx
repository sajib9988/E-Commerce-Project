import type { Metadata } from "next";
import { ContactForm } from "@/components/storefront/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with our team. We are happy to help with your questions.",
};

export default function ContactPage() {
  return (
    <main className="min-h-[calc(100vh-72px)] bg-stone-50">
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:px-12 lg:py-24">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
            We are here to help
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
            Contact our team.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-stone-600">
            Have a question about an order, a product, or something else? Send
            us a message and our team will get back to you.
          </p>
          <div className="mt-10 border-t border-stone-200 pt-6">
            <p className="text-sm font-semibold text-stone-900">A quick note</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
              Please include enough detail in your message so we can help you
              as quickly as possible.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="mb-7 text-xl font-semibold tracking-tight text-stone-950">
            Send us a message
          </h2>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
