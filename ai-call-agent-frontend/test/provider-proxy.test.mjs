import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_BACKEND_PROXY_ORIGIN,
  buildBackendProxyUpstreamUrl,
  buildForwardedRequestHeaders,
  resolveProxyRequestBody,
} from "../src/lib/backend-proxy.mjs";

test("provider webhook path maps 1:1 under /api/v1", () => {
  assert.equal(
    buildBackendProxyUpstreamUrl(
      ["webhooks", "twilio", "incoming-call"],
      DEFAULT_BACKEND_PROXY_ORIGIN,
    ),
    `${DEFAULT_BACKEND_PROXY_ORIGIN}/api/v1/webhooks/twilio/incoming-call`,
  );
  assert.equal(
    buildBackendProxyUpstreamUrl(
      ["webhooks", "elevenlabs", "conversation-events"],
      DEFAULT_BACKEND_PROXY_ORIGIN,
      "?type=post_call_transcription",
    ),
    `${DEFAULT_BACKEND_PROXY_ORIGIN}/api/v1/webhooks/elevenlabs/conversation-events?type=post_call_transcription`,
  );
});

test("provider proxy forwards signature headers and raw body", async () => {
  const incoming = new Headers({
    "content-type": "application/x-www-form-urlencoded",
    "x-twilio-signature": "sig-value",
    "x-elevenlabs-signature": "t=1,v0=abc",
    authorization: "Bearer unused",
    host: "eazi-ai-call.vercel.app",
    connection: "keep-alive",
  });
  const forwarded = buildForwardedRequestHeaders(incoming);
  assert.equal(forwarded.get("x-twilio-signature"), "sig-value");
  assert.equal(forwarded.get("x-elevenlabs-signature"), "t=1,v0=abc");
  assert.equal(forwarded.get("authorization"), "Bearer unused");
  assert.equal(forwarded.get("content-type"), "application/x-www-form-urlencoded");
  assert.equal(forwarded.get("host"), null);
  assert.equal(forwarded.get("connection"), null);

  const raw = "CallSid=CA123&From=%2B15551212";
  const request = new Request(
    "https://eazi-ai-call.vercel.app/api/v1/webhooks/twilio/incoming-call",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: raw,
    },
  );
  const body = await resolveProxyRequestBody(request);
  assert.ok(body instanceof ArrayBuffer);
  assert.equal(Buffer.from(body).toString("utf8"), raw);
});