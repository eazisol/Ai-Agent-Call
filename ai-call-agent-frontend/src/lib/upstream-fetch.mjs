import { Agent } from "undici";

/**
 * Reuse TLS connections from Vercel to CloudFront on warm invocations.
 * Keep idle lifetime below typical CloudFront/ALB idle timeouts to avoid stale sockets.
 */
export const upstreamFetchDispatcher = new Agent({
  connect: {
    timeout: 8_000,
  },
  keepAliveTimeout: 4_000,
  keepAliveMaxTimeout: 10_000,
  connections: 8,
  pipelining: 1,
});

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
 * Fetch CloudFront with keep-alive when healthy; retry once without the pooled agent
 * when a stale connection or transient network fault occurs.
 */
export async function fetchUpstream(url, init = {}) {
  const headers = new Headers(init.headers ?? undefined);
  let lastError;

  for (let attempt = 1; attempt <= UPSTREAM_FETCH_MAX_ATTEMPTS; attempt += 1) {
    const usePooledAgent = attempt === 1;
    if (!usePooledAgent) {
      headers.set("connection", "close");
    }

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
        ...(usePooledAgent
          ? {
              // @ts-expect-error Node fetch accepts undici dispatcher for connection reuse.
              dispatcher: upstreamFetchDispatcher,
            }
          : {}),
      });
      return response;
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
