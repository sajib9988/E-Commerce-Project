
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);
const MEDIA_PROTOCOLS = new Set(["http:", "https:"]);

function sanitize(
  raw: unknown,
  protocols: Set<string>,
  allowHash: boolean,
): string | null {
  if (typeof raw !== "string") return null;

  const url = raw.trim();

  if (!url || url.length > 2048 || /[\u0000-\u001F\u007F]/.test(url)) {
    return null;
  }

  if (url.startsWith("/")) {
    return url.startsWith("//") || url.startsWith("/\\") ? null : url;
  }

  if (allowHash && url.startsWith("#")) return url;

  try {
    return protocols.has(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

export const safeLinkUrl = (raw: unknown) =>
  sanitize(raw, LINK_PROTOCOLS, true);

export const safeMediaUrl = (raw: unknown) =>
  sanitize(raw, MEDIA_PROTOCOLS, false);
