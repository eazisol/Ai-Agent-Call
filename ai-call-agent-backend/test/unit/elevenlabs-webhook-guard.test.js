const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const test = require('node:test');
const {
  ElevenLabsWebhookGuard,
} = require('../../dist/modules/calls/elevenlabs-webhook.guard');

function createGuard({
  secret = 'test-webhook-secret',
  nodeEnv = 'test',
} = {}) {
  const config = {
    get: (key) => {
      if (key === 'inboundCall.elevenLabsWebhookSecret') return secret;
      if (key === 'app.nodeEnv') return nodeEnv;
      return undefined;
    },
  };
  return new ElevenLabsWebhookGuard(config);
}

function createContext(rawBody, signature, parsedBody) {
  const bodyBuffer = Buffer.from(rawBody, 'utf8');
  const resolvedSignature =
    signature ??
    createHmac('sha256', 'test-webhook-secret')
      .update(bodyBuffer)
      .digest('hex');

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name) =>
          name.toLowerCase() === 'x-elevenlabs-signature'
            ? resolvedSignature
            : undefined,
        rawBody: bodyBuffer,
        body: parsedBody ?? JSON.parse(rawBody),
      }),
    }),
  };
}

test('ElevenLabsWebhookGuard bypasses validation in test when secret is empty', () => {
  const guard = createGuard({ secret: '', nodeEnv: 'test' });
  assert.equal(
    guard.canActivate(createContext('{"conversation_id":"conv-1"}', 'invalid')),
    true,
  );
});

test('ElevenLabsWebhookGuard fails closed in production when secret is empty', () => {
  const guard = createGuard({ secret: '', nodeEnv: 'production' });
  assert.throws(
    () => guard.canActivate(createContext('{"conversation_id":"conv-1"}')),
    (error) => error.message === 'ElevenLabs webhook secret is not configured.',
  );
});

test('ElevenLabsWebhookGuard rejects invalid signatures', () => {
  const guard = createGuard();
  assert.throws(
    () =>
      guard.canActivate(
        createContext('{"conversation_id":"conv-1"}', 'bad-signature'),
      ),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('ElevenLabsWebhookGuard rejects malformed signatures', () => {
  const guard = createGuard();
  assert.throws(
    () =>
      guard.canActivate(
        createContext(
          '{"conversation_id":"conv-1"}',
          'not-a-valid-hex-signature',
        ),
      ),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('ElevenLabsWebhookGuard accepts valid signatures from exact raw bytes', () => {
  const guard = createGuard();
  const rawBody =
    '{"conversation_id":"conv-1","event_type":"conversation_started"}';
  assert.equal(guard.canActivate(createContext(rawBody)), true);
});

test('ElevenLabsWebhookGuard does not verify using parsed-body reserialization', () => {
  const guard = createGuard();
  const rawBody =
    '{"conversation_id":"conv-1","event_type":"conversation_started"}';
  const prettyBody =
    '{\n  "conversation_id": "conv-1",\n  "event_type": "conversation_started"\n}';
  const parsedBody = JSON.parse(rawBody);
  const compactSignature = createHmac('sha256', 'test-webhook-secret')
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('hex');

  assert.equal(
    guard.canActivate(createContext(rawBody, undefined, parsedBody)),
    true,
  );

  assert.throws(
    () =>
      guard.canActivate(
        createContext(prettyBody, compactSignature, parsedBody),
      ),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('ElevenLabsWebhookGuard rejects missing raw body', () => {
  const guard = createGuard();
  assert.throws(
    () =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            header: () => 'abc',
            rawBody: undefined,
            body: {},
          }),
        }),
      }),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});
