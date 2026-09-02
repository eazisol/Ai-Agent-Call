/** Per-attempt ceiling; route retries once on transient upstream failure. */
export const UPSTREAM_FETCH_TIMEOUT_MS = 12_000;

export const UPSTREAM_FETCH_MAX_ATTEMPTS = 2;

function isRetryableUpstreamError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    error.code === "ECONNRESET" ||
    error.code === "ECONNREFUSED" ||
    error.code === "UND_ERR_SOCKET" ||
    error.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error.code === "UND_ERR_HEADERS_TIMEOUT" ||
    error.code === "UND_ERR_BODY_TIMEOUT"
  );
}

/**
 * Fetch CloudFront with a fresh connection each attempt to avoid stale pooled sockets
 * between Vercel serverless invocations and CloudFront/ALB idle timeouts.
 */
export async function fetchUpstream(url, init = {}) {
  const headers = new Headers(init.headers ?? undefined);
  headers.set("connection", "close");
  let lastError;

  for (let attempt = 1; attempt <= UPSTREAM_FETCH_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (
        attempt < UPSTREAM_FETCH_MAX_ATTEMPTS &&
        isRetryableUpstreamError(error)
      ) {
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("Upstream fetch failed");
}
