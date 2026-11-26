
"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  resetKey?: number;
}

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      theme: "light" | "dark" | "auto";
      size: "normal" | "flexible" | "compact";
      appearance: "always" | "execute" | "interaction-only";
    },
  ) => string;

  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

function getTurnstile(): TurnstileApi | undefined {
  return (
    window as Window & { turnstile?: TurnstileApi }
  ).turnstile;
}

export default function Turnstile({
  onVerify,
  onExpire,
  resetKey = 0,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const callbacksRef = useRef({ onVerify, onExpire });
  callbacksRef.current = { onVerify, onExpire };

  const renderWidget = useCallback(() => {
    const turnstile = getTurnstile();

    if (
      !containerRef.current ||
      !turnstile ||
      widgetIdRef.current
    ) {
      return;
    }

    widgetIdRef.current = turnstile.render(
      containerRef.current,
      {
        sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,

        callback: (token) => {
          callbacksRef.current.onVerify(token);
        },

        "expired-callback": () => {
          callbacksRef.current.onExpire?.();
        },
        theme: "dark",
        size: "normal",
        appearance: "always",
      },
    );
  }, []);

  // Initialize and clean up widget.
  useEffect(() => {
    renderWidget();

    return () => {
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;

      if (widgetId) {
        getTurnstile()?.remove(widgetId);
      }
    };
  }, [renderWidget]);

  // Reset widget when resetKey changes.
  useEffect(() => {
    const widgetId = widgetIdRef.current;

    if (resetKey > 0 && widgetId) {
      getTurnstile()?.reset(widgetId);
    }
  }, [resetKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />

      <div ref={containerRef} className="flex min-h-[65px] w-full items-center justify-center" />
    </>
  );
}
