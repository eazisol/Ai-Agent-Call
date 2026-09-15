const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const test = require('node:test');
const {
  ElevenLabsWebhookGuard,
} = require('../../dist/modules/calls/elevenlabs-webhook.guard');

const SECRET = 'test-webhook-secret';

function createGuard({ secret = SECRET, nodeEnv = 'test' } = {}) {
  const config = {
    get: (key) => {
      if (key === 'inboundCall.elevenLabsWebhookSecret') return secret;
      if (key === 'app.nodeEnv') return nodeEnv;
      return undefined;
    },
  };
  return new ElevenLabsWebhookGuard(config);
}

function signOfficial(rawBody, secret = SECRET, timestamp = String(Math.floor(Date.now() / 1000))) {
  const bodyBuffer = Buffer.from(rawBody, 'utf8');
  const digest = createHmac('sha256', secret)
    .update(`${timestamp}.${bodyBuffer.toString('utf8')}`, 'utf8')
    .digest('hex');
  return {
    timestamp,
    header: `t=${timestamp},v0=${digest}`,
    bodyBuffer,
  };
}

function createContext(rawBody, signatureHeader, parsedBody) {
  const bodyBuffer = Buffer.from(rawBody, 'utf8');
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name) => {
          const lower = String(name).toLowerCase();
          if (
            lower === 'elevenlabs-signature' ||
            lower === 'x-elevenlabs-signature'
          ) {
            return signatureHeader;
          }
          return undefined;
        },
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

test('accepts official-format ElevenLabs-Signature over exact raw bytes', () => {
  const guard = createGuard();
  const rawBody =
    '{"type":"post_call_transcription","data":{"conversation_id":"conv-1"}}';
  const { header } = signOfficial(rawBody);
  assert.equal(guard.canActivate(createContext(rawBody, header)), true);
});

test('rejects body changed by one byte against original official signature', () => {
  const guard = createGuard();
  const rawBody =
    '{"type":"post_call_transcription","data":{"conversation_id":"conv-1"}}';
  const { header } = signOfficial(rawBody);
  const mutated = rawBody.replace('conv-1', 'conv-2');
  assert.throws(
    () => guard.canActivate(createContext(mutated, header)),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('rejects when v0 digest is changed', () => {
  const guard = createGuard();
  const rawBody = '{"conversation_id":"conv-1"}';
  const { timestamp } = signOfficial(rawBody);
  const badHeader = `t=${timestamp},v0=${'0'.repeat(64)}`;
  assert.throws(
    () => guard.canActivate(createContext(rawBody, badHeader)),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('rejects missing signature header', () => {
  const guard = createGuard();
  assert.throws(
    () => guard.canActivate(createContext('{"conversation_id":"conv-1"}', '')),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('rejects malformed signature header', () => {
  const guard = createGuard();
  assert.throws(
    () =>
      guard.canActivate(
        createContext('{"conversation_id":"conv-1"}', 'not-official-format'),
      ),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('rejects signature created with wrong secret', () => {
  const guard = createGuard();
  const rawBody = '{"conversation_id":"conv-1"}';
  const { header } = signOfficial(rawBody, 'other-secret');
  assert.throws(
    () => guard.canActivate(createContext(rawBody, header)),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('rejects stale timestamp outside 30-minute window', () => {
  const guard = createGuard();
  const rawBody = '{"conversation_id":"conv-1"}';
  const stale = String(Math.floor(Date.now() / 1000) - 31 * 60);
  const { header } = signOfficial(rawBody, SECRET, stale);
  assert.throws(
    () => guard.canActivate(createContext(rawBody, header)),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('rejects legacy HMAC(rawBody)-only hex (old incorrect contract)', () => {
  const guard = createGuard();
  const rawBody = '{"conversation_id":"conv-1"}';
  const legacy = createHmac('sha256', SECRET)
    .update(Buffer.from(rawBody, 'utf8'))
    .digest('hex');
  assert.throws(
    () => guard.canActivate(createContext(rawBody, legacy)),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('does not validate against JSON reserialized with different whitespace', () => {
  const guard = createGuard();
  const rawBody =
    '{"type":"post_call_transcription","data":{"conversation_id":"conv-1"}}';
  const prettyBody =
    '{\n  "type": "post_call_transcription",\n  "data": {\n    "conversation_id": "conv-1"\n  }\n}';
  const { header } = signOfficial(rawBody);
  const parsedBody = JSON.parse(rawBody);

  assert.equal(
    guard.canActivate(createContext(rawBody, header, parsedBody)),
    true,
  );
  assert.throws(
    () => guard.canActivate(createContext(prettyBody, header, parsedBody)),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('accepts one of multiple v0 digests in header', () => {
  const guard = createGuard();
  const rawBody = '{"conversation_id":"conv-1"}';
  const { timestamp, header } = signOfficial(rawBody);
  const multi = `${header},v0=${'a'.repeat(64)}`;
  assert.equal(guard.canActivate(createContext(rawBody, multi)), true);
  assert.match(multi, new RegExp(`t=${timestamp}`));
});

test('rejects missing raw body', () => {
  const guard = createGuard();
  const { header } = signOfficial('{"conversation_id":"conv-1"}');
  assert.throws(
    () =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            header: () => header,
            rawBody: undefined,
            body: {},
          }),
        }),
      }),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});
