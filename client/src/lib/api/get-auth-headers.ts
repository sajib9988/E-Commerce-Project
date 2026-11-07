import "server-only";

import { cookies } from "next/headers";

/**
 * Build request headers for server-side API calls.
 *
 * Keep this helper server-only because Next.js cookies() is only available
 * in the server request context. Pass false for FormData requests so the
 * browser/runtime can set the multipart Content-Type boundary.
 */
export async function getAuthHeaders(
  isJson = true,
): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  return {
    ...(isJson ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}
