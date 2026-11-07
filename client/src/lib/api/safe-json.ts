/**
 * Parse a JSON API response without throwing for empty or non-JSON bodies.
 *
 * HTTP status handling belongs to the service that made the request;
 * this helper only parses the response body.
 */
export async function safeJson<T>(
  response: Response,
): Promise<T | null> {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type");
  if (!contentType?.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
