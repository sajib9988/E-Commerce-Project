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
      init: (options: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void;
      login: (callback: (response: { authResponse?: { accessToken?: string } }) => void, options: { scope: string }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

export function OAuthLoginButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<Provider | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [facebookReady, setFacebookReady] = useState(false);

  useEffect(() => {
    if (GOOGLE_CLIENT_ID && !window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleReady(Boolean(window.google));
      document.head.appendChild(script);
    } else if (window.google) {
      setGoogleReady(true);
    }

    if (FACEBOOK_APP_ID && !window.FB) {
      window.fbAsyncInit = () => {
        window.FB?.init({ appId: FACEBOOK_APP_ID, cookie: true, xfbml: false, version: "v21.0" });
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
      const data = result.data as { message?: string; requiresEmailVerification?: boolean; user?: { role?: string } } | null;
      if (!result.ok) {
        toast.error(data?.message || "Could not sign in with this provider.");
        return;
      }
      if (data?.requiresEmailVerification) {
        toast.success(data.message || "Check your email to verify your account.");
        return;
      }
      toast.success("Signed in successfully.");
      router.replace(data?.user?.role === "ADMIN" || data?.user?.role === "SUPER_ADMIN" ? "/admin" : "/");
      router.refresh();
    } catch {
      toast.error("OAuth sign-in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function signInWithGoogle() {
    if (!GOOGLE_CLIENT_ID || !window.google) {
      toast.error("Google sign-in is not configured.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.access_token) void completeLogin("google", response.access_token);
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
    window.FB.login((response) => {
      const token = response.authResponse?.accessToken;
      if (token) void completeLogin("facebook", token);
      else toast.error("Facebook sign-in was cancelled.");
    }, { scope: "public_profile,email" });
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="relative flex items-center">
        <span className="h-px flex-1 bg-white/15" />
        <span className="px-3 text-[10px] uppercase tracking-[.16em] text-white/40">or continue with</span>
        <span className="h-px flex-1 bg-white/15" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={signInWithGoogle} disabled={loading !== null || !googleReady} className="h-11 rounded-xl border border-white/20 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
          {loading === "google" ? "Connecting..." : "Google"}
        </button>
        <button type="button" onClick={signInWithFacebook} disabled={loading !== null || !facebookReady} className="h-11 rounded-xl border border-white/20 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
          {loading === "facebook" ? "Connecting..." : "Facebook"}
        </button>
      </div>
      {(!GOOGLE_CLIENT_ID || !FACEBOOK_APP_ID) && <p className="text-center text-[10px] text-white/40">Configure the public Google and Facebook app IDs to enable social sign-in.</p>}
    </div>
  );
}
