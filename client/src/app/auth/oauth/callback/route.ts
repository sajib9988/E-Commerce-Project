import { NextRequest, NextResponse } from 'next/server';

type OAuthSession = {
  accessToken: string;
  refreshToken: string;
  user: { role?: string };
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const failureUrl = new URL('/login?oauth=failed', request.url);
  if (!code || !apiBaseUrl) return NextResponse.redirect(failureUrl);

  try {
    const response = await fetch(apiBaseUrl + '/auth/oauth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store',
    });
    const session = await response.json() as OAuthSession;
    if (!response.ok || !session.accessToken || !session.refreshToken) {
      return NextResponse.redirect(failureUrl);
    }

    const destination = session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN' ? '/admin' : '/';
    const redirectResponse = NextResponse.redirect(new URL(destination, request.url));
    const secure = process.env.NODE_ENV === 'production';
    redirectResponse.cookies.set('accessToken', session.accessToken, {
      httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 30 * 60,
    });
    redirectResponse.cookies.set('refreshToken', session.refreshToken, {
      httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    });
    return redirectResponse;
  } catch {
    return NextResponse.redirect(failureUrl);
  }
}
