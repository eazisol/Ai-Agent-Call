import { Agent } from "undici";

/** Reuse TLS connections from Vercel to CloudFront to avoid per-request handshake cost. */
export const upstreamFetchDispatcher = new Agent({
  connect: {
    timeout: 10_000,
  },
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connections: 32,
  pipelining: 1,
});

export const UPSTREAM_FETCH_TIMEOUT_MS = 25_000;
