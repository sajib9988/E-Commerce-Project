"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { submitContactForm } from "@/service/contact.service";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const inputClass =
  "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [widgetError, setWidgetError] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleTurnstileToken = useCallback((token: string) => {
    setTurnstileToken(token);
    setWidgetError(false);
  }, []);

  useEffect(() => {
    if (!scriptReady || !TURNSTILE_SITE_KEY || !widgetContainerRef.current || !window.turnstile || widgetIdRef.current) {
      return;
    }

    widgetIdRef.current = window.turnstile.render(widgetContainerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: handleTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => {
        setTurnstileToken("");
        setWidgetError(true);
      },
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [handleTurnstileToken, scriptReady]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!TURNSTILE_SITE_KEY || !turnstileToken) {
      setFeedback({
        type: "error",
        message: "Please complete the security verification before sending your message.",
      });
      return;
    }

    const form = event.currentTarget;
    const values = new FormData(form);
    const data = {
      name: String(values.get("name") ?? ""),
      email: String(values.get("email") ?? ""),
      phone: String(values.get("phone") ?? ""),
      subject: String(values.get("subject") ?? ""),
      message: String(values.get("message") ?? ""),
      turnstileToken,
    };

    startTransition(async () => {
      const result = await submitContactForm(data);
      if ("success" in result && result.success === false) {
        setFeedback({ type: "error", message: result.message });
      } else {
        setFeedback({ type: "success", message: result.message });
        form.reset();
      }

      // Turnstile tokens are single-use. Ask for a fresh challenge after each attempt.
      setTurnstileToken("");
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    });
  }

  return (
    <>
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
          onError={() => setWidgetError(true)}
        />
      )}

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

        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-800">Security verification</p>
          {TURNSTILE_SITE_KEY ? (
            <div ref={widgetContainerRef} />
          ) : (
            <p className="text-sm text-red-700">Security verification is not configured. Please contact the site administrator.</p>
          )}
          {widgetError && (
            <p role="alert" className="text-sm text-red-700">
              Security verification could not load. Please refresh the page and try again.
            </p>
          )}
        </div>

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
          disabled={isPending || !turnstileToken}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-950 px-7 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isPending ? "Sending..." : "Send message"}
        </button>
      </form>
    </>
  );
}
