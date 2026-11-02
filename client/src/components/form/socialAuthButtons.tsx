"use client";

import { Facebook, Chrome } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

export default function SocialAuthButtons() {
  const startOAuth = (provider: "google" | "facebook") => {
    if (!API_BASE_URL) {
      console.error("NEXT_PUBLIC_BASE_URL is not configured.");
      return;
    }

    // The browser must navigate to the API so Passport can redirect
    // the user to the selected identity provider.
    window.location.assign(`${API_BASE_URL.replace(/\/$/, "")}/auth/${provider}`);
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/15" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#14252d] px-3 text-white/45">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => startOAuth("google")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <Chrome className="h-4 w-4" />
          Google
        </button>
        <button
          type="button"
          onClick={() => startOAuth("facebook")}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <Facebook className="h-4 w-4" />
          Facebook
        </button>
      </div>
    </div>
  );
}
