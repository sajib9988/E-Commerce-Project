"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { oauthLogin } from "@/service/auth.service";

type Provider = "google" | "facebook";
type GoogleTokenResponse = { access_token?: string; error?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
    FB?: {
      init: (options: {
        appId: string;
        cookie: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: { accessToken?: string };
        }) => void,
        options: { scope: string },
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="block h-5 w-5 shrink-0" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision">
    <path
      fill="#FFC107"
      d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg viewBox="6.5 3.5 11.5 18" className="block h-5 w-5 shrink-0" aria-hidden="true" focusable="false" shapeRendering="geometricPrecision">
    <path
      fill="#1877F2"
      d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8h3.4z"
    />
  </svg>
);

const btnClass =
  "flex h-9 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.045] text-sm font-medium text-white/85 transition hover:border-white/25 hover:bg-white/[0.09] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export function OAuthLoginButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<Provider | null>(null);
  const [facebookReady, setFacebookReady] = useState(false);

  useEffect(() => {
    if (GOOGLE_CLIENT_ID && !window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        toast.error("Google sign-in could not load. Check your network or content blocker.");
      };
      document.head.appendChild(script);
    }

    if (FACEBOOK_APP_ID && !window.FB) {
      window.fbAsyncInit = () => {
        window.FB?.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
        setFacebookReady(Boolean(window.FB));
      };
      if (!document.getElementById("facebook-jssdk")) {
        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.src = "https://connect.facebook.net/en_US/sdk.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    } else if (window.FB) {
      setFacebookReady(true);
    }
  }, []);

  async function completeLogin(provider: Provider, accessToken: string) {
    setLoading(provider);
    try {
      const result = await oauthLogin(provider, accessToken);
      const data = result.data as {
        message?: string;
        requiresEmailVerification?: boolean;
        user?: { role?: string };
      } | null;
      if (!result.ok) {
        toast.error(data?.message || "Could not sign in with this provider.");
        return;
      }
      if (data?.requiresEmailVerification) {
        toast.success(
          data.message || "Check your email to verify your account.",
        );
        return;
      }
      toast.success("Signed in successfully.");
      router.replace(
        data?.user?.role === "ADMIN" || data?.user?.role === "SUPER_ADMIN"
          ? "/admin"
          : "/",
      );
      router.refresh();
    } catch {
      toast.error("OAuth sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function signInWithGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google sign-in is not configured. Check NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
      return;
    }
    if (!window.google) {
      toast.error("Google sign-in is still loading. Please try again in a moment.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.access_token)
          void completeLogin("google", response.access_token);
        else toast.error(response.error || "Google sign-in was cancelled.");
      },
    });
    client.requestAccessToken();
  }

  function signInWithFacebook() {
    if (!FACEBOOK_APP_ID || !window.FB) {
      toast.error("Facebook sign-in is not configured.");
      return;
    }
    window.FB.login(
      (response) => {
        const token = response.authResponse?.accessToken;
        if (token) void completeLogin("facebook", token);
        else toast.error("Facebook sign-in was cancelled.");
      },
      { scope: "public_profile,email" },
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="relative flex items-center">
        <span className="h-px flex-1 bg-white/15" />
        <span className="px-3 text-[10px] uppercase tracking-[.16em] text-white/40">
          or continue with
        </span>
        <span className="h-px flex-1 bg-white/15" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading !== null || !GOOGLE_CLIENT_ID}
          aria-label="Continue with Google"
          className={btnClass}
        >
          <GoogleIcon />
          {loading === "google" ? "Connecting..." : "Google"}
        </button>

        <button
          type="button"
          onClick={signInWithFacebook}
          disabled={loading !== null || !facebookReady}
          aria-label="Continue with Facebook"
          className={btnClass}
        >
          <FacebookIcon />
          {loading === "facebook" ? "Connecting..." : "Facebook"}
        </button>
      </div>

      {process.env.NODE_ENV === "development" &&
        (!GOOGLE_CLIENT_ID || !FACEBOOK_APP_ID) && (
          <p className="text-center text-[10px] text-white/40">
            Configure the public Google and Facebook app IDs to enable social
            sign-in.
          </p>
        )}
    </div>
  );
}
