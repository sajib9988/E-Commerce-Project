import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
const ACCESS_TOKEN_MAX_AGE = 30 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function shouldRefresh(accessToken?: string) {
  if (!accessToken) return true;

  try {
    const payload = accessToken.split(".")[1];
    if (!payload) return true;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(normalized));
    return typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000) + 60;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!refreshToken || !shouldRefresh(accessToken) || !API_BASE_URL) {
    return NextResponse.next();
  }

  let refreshResponse: Response;
  try {
    refreshResponse = await fetch(
      `${API_BASE_URL.replace(/\\/+$/, "")}/auth/refresh`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      },
    );
  } catch {
    // A temporary API/network outage must not destroy a still-present session.
    return NextResponse.next();
  }

  if (!refreshResponse.ok) {
    const response = NextResponse.next();
    response.cookies.delete("accessToken");
    response.cookies.delete("refreshToken");
    return response;
  }

  let session: { accessToken?: string; refreshToken?: string };
  try {
    session = await refreshResponse.json();
  } catch {
    return NextResponse.next();
  }

  if (!session.accessToken || !session.refreshToken) {
    return NextResponse.next();
  }

  // Forward rotated tokens to Server Components in this same request.
  request.cookies.set("accessToken", session.accessToken);
  request.cookies.set("refreshToken", session.refreshToken);

  const response = NextResponse.next({ request });
  response.cookies.set("accessToken", session.accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set("refreshToken", session.refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
