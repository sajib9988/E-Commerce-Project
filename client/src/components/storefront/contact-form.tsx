"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitContactForm } from "@/service/contact.service";

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const form = event.currentTarget;
    const values = new FormData(form);
    const data = {
      name: String(values.get("name") ?? ""),
      email: String(values.get("email") ?? ""),
      phone: String(values.get("phone") ?? ""),
      subject: String(values.get("subject") ?? ""),
      message: String(values.get("message") ?? ""),
    };

    startTransition(async () => {
      const result = await submitContactForm(data);
      if ("success" in result && result.success === false) {
        setFeedback({ type: "error", message: result.message });
        return;
      }

      setFeedback({ type: "success", message: result.message });
      form.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-800">
          Full name
          <input className={inputClass} name="name" type="text" autoComplete="name" placeholder="Your name" maxLength={100} required />
        </label>
        <label className="block text-sm font-medium text-stone-800">
          Email address
          <input className={inputClass} name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={320} required />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-800">
          Phone number <span className="font-normal text-stone-400">(optional)</span>
          <input className={inputClass} name="phone" type="tel" autoComplete="tel" placeholder="+1 (555) 000-0000" maxLength={30} />
        </label>
        <label className="block text-sm font-medium text-stone-800">
          Subject
          <input className={inputClass} name="subject" type="text" placeholder="How can we help?" maxLength={150} required />
        </label>
      </div>

      <label className="block text-sm font-medium text-stone-800">
        Message
        <textarea className={inputClass + " min-h-36 resize-y"} name="message" placeholder="Tell us a little more..." maxLength={5000} required />
      </label>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className={"rounded-xl px-4 py-3 text-sm " + (feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}
        >
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-950 px-7 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
