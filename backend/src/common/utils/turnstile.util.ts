const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

type TurnstileVerifyResponse = {
  success: boolean;
  'error-codes'?: string[];
};

// Verify Turnstile server-side. Missing secrets fail closed in production;
// local development may omit the secret to avoid blocking local-only testing.
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }
  if (!token.trim()) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) {
    body.append('remoteip', remoteIp);
  }

  try {
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8_000) });
    const data = (await res.json()) as TurnstileVerifyResponse;
    return data.success;
  } catch {
    return false;
  }
}
