import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ACCESS_TOKEN_MAX_AGE = 30 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

function safeRedirect(request: NextRequest, path: string) {
  // Only accept an application-relative path; never redirect to a user-supplied host.
  if (!path.startsWith('/') || path.startsWith('//')) return new URL('/', request.url);
  return new URL(path, request.url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code || code.length < 32 || code.length > 200) {
    return NextResponse.redirect(safeRedirect(request, '/login?oauth=failed'));
  }

  const apiBase = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!apiBase) {
    return NextResponse.redirect(safeRedirect(request, '/login?oauth=failed'));
  }

  let responseData: { accessToken?: string; refreshToken?: string; user?: unknown };
  try {
    const exchange = await fetch(`${apiBase}/auth/oauth/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });
    if (!exchange.ok) {
      return NextResponse.redirect(safeRedirect(request, '/login?oauth=failed'));
    }
    responseData = await exchange.json() as typeof responseData;
  } catch {
    return NextResponse.redirect(safeRedirect(request, '/login?oauth=failed'));
  }

  if (!responseData.accessToken || !responseData.refreshToken) {
    return NextResponse.redirect(safeRedirect(request, '/login?oauth=failed'));
  }

  const redirect = NextResponse.redirect(safeRedirect(request, '/'));
  const secure = process.env.NODE_ENV === 'production';
  redirect.cookies.set('accessToken', responseData.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  redirect.cookies.set('refreshToken', responseData.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  return redirect;
}
