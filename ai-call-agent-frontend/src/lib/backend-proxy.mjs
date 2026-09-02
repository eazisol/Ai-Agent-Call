/** @typedef {string | undefined} MaybeString */

/** Temporary no-domain production ALB origin (HTTP until custom domain + ACM). */
export const DEFAULT_BACKEND_PROXY_ORIGIN =
  "http://eaziacall-prod-alb-2044075500.us-east-1.elb.amazonaws.com";

const LEGACY_CLOUDFRONT_ORIGINS = new Set([
  "https://dl1t1qnfxrdka.cloudfront.net",
  "https://d1skouyk8kdayh.cloudfront.net",
]);

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

const PROXY_REQUEST_HEADERS_TO_STRIP = new Set([
  ...HOP_BY_HOP_HEADERS,
  "content-length",
]);

const PROXY_RESPONSE_HEADERS_TO_STRIP = new Set([
  ...HOP_BY_HOP_HEADERS,
  "set-cookie",
  "content-encoding",
  "content-length",
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

function isAllowedProxyOrigin(parsed) {
  if (!parsed.host) return false;
  if (parsed.protocol === "https:") return true;
  if (parsed.protocol === "http:" && parsed.hostname.endsWith(".elb.amazonaws.com")) {
    return true;
  }
  return false;
}

export function resolveBackendProxyOrigin(configuredOrigin) {
  let origin = (configuredOrigin || DEFAULT_BACKEND_PROXY_ORIGIN).trim();
  if (LEGACY_CLOUDFRONT_ORIGINS.has(origin.replace(/\/$/, ""))) {
    origin = DEFAULT_BACKEND_PROXY_ORIGIN;
  }
  const parsed = new URL(origin);
  if (!isAllowedProxyOrigin(parsed)) {
    throw new Error(
      "Backend proxy origin must be https or temporary http ALB (*.elb.amazonaws.com)",
    );
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
    if (PROXY_REQUEST_HEADERS_TO_STRIP.has(lower)) return;
    headers.set(key, value);
  });
  return headers;
}

export function buildForwardedResponseHeaders(upstreamHeaders) {
  const headers = new Headers();
  upstreamHeaders.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (PROXY_RESPONSE_HEADERS_TO_STRIP.has(lower)) return;
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

export async function resolveProxyRequestBody(request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return undefined;
  return request.arrayBuffer();
}

export const BROWSER_API_BASE = "/api/backend";
export const LOCAL_SERVER_API_BASE = "http://localhost:3000/api/v1";

export function buildApiUrl(path, internalBaseUrl, publicBaseUrl) {
  const baseUrl =
    internalBaseUrl ||
    publicBaseUrl ||
    (typeof window !== "undefined" ? BROWSER_API_BASE : LOCAL_SERVER_API_BASE);
  const normalizedPath = String(path || "").replace(/^\//, "");
  if (baseUrl.startsWith("/")) {
    const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${base}/${normalizedPath}`;
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(normalizedPath, normalizedBase).toString();
}