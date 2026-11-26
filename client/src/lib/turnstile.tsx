"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  resetKey?: number;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
    theme: "light" | "dark" | "auto";
    size: "normal" | "flexible" | "compact";
    appearance: "always" | "execute" | "interaction-only";
  }) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

function getTurnstile(): TurnstileApi | undefined {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function Turnstile({ onVerify, onExpire, onError, resetKey = 0 }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onVerify, onExpire, onError });
  callbacksRef.current = { onVerify, onExpire, onError };

  const renderWidget = useCallback(() => {
    const turnstile = getTurnstile();
    if (!SITE_KEY || !containerRef.current || !turnstile || widgetIdRef.current) return;

    widgetIdRef.current = turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token) => callbacksRef.current.onVerify(token),
      "expired-callback": () => callbacksRef.current.onExpire?.(),
      "error-callback": () => callbacksRef.current.onError?.(),
      theme: "dark",
      size: "flexible",
      appearance: "always",
    });
  }, []);

  useEffect(() => {
    renderWidget();
    return () => {
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId) getTurnstile()?.remove(widgetId);
    };
  }, [renderWidget]);

  useEffect(() => {
    const widgetId = widgetIdRef.current;
    if (resetKey > 0 && widgetId) getTurnstile()?.reset(widgetId);
  }, [resetKey]);

  if (!SITE_KEY) {
    return <p className="px-2 text-center text-xs leading-5 text-amber-300">Security verification is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to client/.env.local and restart the frontend.</p>;
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onLoad={renderWidget} onError={() => callbacksRef.current.onError?.()} />
      <div ref={containerRef} className="flex min-h-[65px] w-full min-w-0 items-center justify-center" />
    </>
  );
}
