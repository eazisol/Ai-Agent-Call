/** @typedef {string | undefined} MaybeString */

export const DEFAULT_BACKEND_PROXY_ORIGIN =
  "https://dl1t1qnfxrdka.cloudfront.net";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

export function validateProxyPathSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error("Proxy path is required");
  }
  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
      throw new Error("Invalid proxy path segment");
    }
    if (segment.includes("\\") || segment.includes("/")) {
      throw new Error("Invalid proxy path segment");
    }
  }
}

export function buildBackendProxyUpstreamPath(segments) {
  validateProxyPathSegments(segments);
  return `/api/v1/${segments.map(encodeURIComponent).join("/")}`;
}

export function resolveBackendProxyOrigin(configuredOrigin) {
  const origin = (configuredOrigin || DEFAULT_BACKEND_PROXY_ORIGIN).trim();
  if (!origin.startsWith("https://")) {
    throw new Error("Backend proxy origin must be a fixed https URL");
  }
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" || !parsed.host) {
    throw new Error("Backend proxy origin must be a valid https URL");
  }
  return parsed.origin;
}

export function buildBackendProxyUpstreamUrl(segments, configuredOrigin, search = "") {
  const origin = resolveBackendProxyOrigin(configuredOrigin);
  const url = new URL(buildBackendProxyUpstreamPath(segments), origin);
  if (search) {
    url.search = search.startsWith("?") ? search.slice(1) : search;
  }
  return url.toString();
}

export function buildForwardedRequestHeaders(requestHeaders) {
  const headers = new Headers();
  requestHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      return;
    }
    headers.set(key, value);
  });
  return headers;
}

export function buildForwardedResponseHeaders(upstreamHeaders) {
  const headers = new Headers();
  upstreamHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower) || lower === "set-cookie") {
      return;
    }
    headers.set(key, value);
  });
  headers.set("cache-control", "no-store");
  return headers;
}

export function getForwardedSetCookieHeaders(upstreamHeaders) {
  if (typeof upstreamHeaders.getSetCookie === "function") {
    return upstreamHeaders.getSetCookie();
  }
  const raw = upstreamHeaders.get("set-cookie");
  return raw ? [raw] : [];
}

export function buildApiUrl(path, internalBaseUrl, publicBaseUrl) {
  const baseUrl =
    internalBaseUrl || publicBaseUrl || "http://localhost:3000/api/v1";
  const normalizedPath = String(path || "").replace(/^\//, "");

  if (baseUrl.startsWith("/")) {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${base}/${normalizedPath}`;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(normalizedPath, normalizedBase).toString();
}
