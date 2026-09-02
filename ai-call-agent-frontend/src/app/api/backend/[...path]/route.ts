import {
  DEFAULT_BACKEND_PROXY_ORIGIN,
  buildBackendProxyUpstreamUrl,
  buildForwardedRequestHeaders,
  buildForwardedResponseHeaders,
  getForwardedSetCookieHeaders,
  resolveBackendProxyOrigin,
  resolveProxyRequestBody,
  validateProxyPathSegments,
} from "@/lib/backend-proxy.mjs";
import { fetchUpstream } from "@/lib/upstream-fetch.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIXED_BACKEND_ORIGIN = resolveBackendProxyOrigin(
  process.env.INTERNAL_BACKEND_ORIGIN ??
    process.env.BACKEND_PROXY_ORIGIN ??
    DEFAULT_BACKEND_PROXY_ORIGIN,
);

async function proxy(request: Request, segments: string[]): Promise<Response> {
  validateProxyPathSegments(segments);
  const incomingUrl = new URL(request.url);
  const upstreamUrl = buildBackendProxyUpstreamUrl(
    segments,
    FIXED_BACKEND_ORIGIN,
    incomingUrl.search,
  );

  const headers = buildForwardedRequestHeaders(request.headers);
  const method = request.method.toUpperCase();
  const body = await resolveProxyRequestBody(request);

  let upstream: Response;
  try {
    upstream = await fetchUpstream(upstreamUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "The upstream API is temporarily unavailable.",
        },
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  const responseHeaders = buildForwardedResponseHeaders(upstream.headers);
  for (const cookie of getForwardedSetCookieHeaders(upstream.headers)) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}