const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ElevenLabsInboundHandoffAdapter,
} = require('../../dist/providers/elevenlabs/elevenlabs-inbound-handoff.adapter');

function createAdapter(configOverrides = {}) {
  const config = {
    get: (key) => {
      if (key === 'elevenlabs.apiKey') return 'test-xi-api-key';
      if (key === 'elevenlabs.baseUrl') return 'https://api.elevenlabs.io';
      if (key === 'elevenlabs.timeoutMs') return 5_000;
      return undefined;
    },
    ...configOverrides,
  };
  return new ElevenLabsInboundHandoffAdapter(config);
}

const resolved = {
  callId: 'call-1',
  externalCallId: 'CA-test-1',
  callerNumber: '+18322661663',
  receiverNumber: '+18314809958',
  businessId: 'biz-1',
  agentId: 'agent-canonical-1',
  externalAgentId: 'agent_5801m1k86tc7ewdbtq36s94dfw6d',
  greeting: 'Hello from Production Receptionist',
};

test('register-call posts official Twilio endpoint with resolved agent and From/To', async () => {
  const adapter = createAdapter();
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      text: async () =>
        '<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://example.test/stream"/></Connect></Response>',
    };
  };

  const twiml = await adapter.buildConnectResponse(resolved);

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    'https://api.elevenlabs.io/v1/convai/twilio/register-call',
  );
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['xi-api-key'], 'test-xi-api-key');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    agent_id: 'agent_5801m1k86tc7ewdbtq36s94dfw6d',
    from_number: '+18322661663',
    to_number: '+18314809958',
    direction: 'inbound',
  });
  assert.match(twiml, /<Connect>/);
  assert.match(twiml, /wss:\/\/example\.test\/stream/);
  assert.doesNotMatch(String(calls[0].url), /get_signed_url|get-signed-url/);
});

test('register-call returns provider TwiML unchanged', async () => {
  const adapter = createAdapter();
  const providerTwiml =
    '<?xml version="1.0"?><Response><Say>Provider greeting</Say><Connect><Stream url="wss://el/x"/></Connect></Response>';
  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => providerTwiml,
  });

  const twiml = await adapter.buildConnectResponse(resolved);
  assert.equal(twiml, providerTwiml);
});

test('register-call 4xx throws PROVIDER_UNAVAILABLE (handoff failure path)', async () => {
  const adapter = createAdapter();
  global.fetch = async () => ({
    ok: false,
    status: 405,
    text: async () => '{"detail":"Method Not Allowed"}',
  });

  await assert.rejects(
    () => adapter.buildConnectResponse(resolved),
    /PROVIDER_UNAVAILABLE/,
  );
});

test('register-call 5xx throws PROVIDER_UNAVAILABLE', async () => {
  const adapter = createAdapter();
  global.fetch = async () => ({
    ok: false,
    status: 503,
    text: async () => 'unavailable',
  });

  await assert.rejects(
    () => adapter.buildConnectResponse(resolved),
    /PROVIDER_UNAVAILABLE/,
  );
});

test('register-call never substitutes a hard-coded HR Agent id', async () => {
  const adapter = createAdapter();
  let body = null;
  global.fetch = async (_url, init = {}) => {
    body = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      text: async () => '<Response><Hangup/></Response>',
    };
  };

  await adapter.buildConnectResponse({
    ...resolved,
    externalAgentId: 'agent_custom_only',
  });
  assert.equal(body.agent_id, 'agent_custom_only');
  assert.notEqual(body.agent_id, 'agent_7101m1gta10mf2nba3gb7c7tz50y');
});

test('buildFailureResponse keeps safe Say Hangup fallback', () => {
  const adapter = createAdapter();
  const xml = adapter.buildFailureResponse({
    externalCallId: 'CA-x',
    failureCode: 'HANDOFF_FAILED',
    safeMessage: 'We could not connect your call. Please try again later.',
  });
  assert.match(xml, /could not connect/i);
  assert.match(xml, /Hangup/i);
});

test('missing From/To fails without calling provider', async () => {
  const adapter = createAdapter();
  let called = false;
  global.fetch = async () => {
    called = true;
    return { ok: true, status: 200, text: async () => '<Response/>' };
  };
  await assert.rejects(
    () =>
      adapter.buildConnectResponse({
        ...resolved,
        callerNumber: undefined,
      }),
    /PROVIDER_UNAVAILABLE/,
  );
  assert.equal(called, false);
});
