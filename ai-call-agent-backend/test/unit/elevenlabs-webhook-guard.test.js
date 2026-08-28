const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const test = require('node:test');
const {
  ElevenLabsWebhookGuard,
} = require('../../dist/modules/calls/elevenlabs-webhook.guard');

function createGuard(secret = 'test-webhook-secret') {
  const config = {
    get: (key) => {
      if (key === 'inboundCall.elevenLabsWebhookSecret') return secret;
      return undefined;
    },
  };
  return new ElevenLabsWebhookGuard(config);
}

function createContext(body = { conversation_id: 'conv-1' }, signature) {
  const payload = JSON.stringify(body);
  const resolvedSignature =
    signature ??
    createHmac('sha256', 'test-webhook-secret').update(payload).digest('hex');

  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name) =>
          name.toLowerCase() === 'x-elevenlabs-signature'
            ? resolvedSignature
            : undefined,
        body,
      }),
    }),
  };
}

test('ElevenLabsWebhookGuard bypasses validation when secret is empty', () => {
  const guard = createGuard('');
  assert.equal(guard.canActivate(createContext({}, 'invalid')), true);
});

test('ElevenLabsWebhookGuard rejects invalid signatures', () => {
  const guard = createGuard();
  assert.throws(
    () => guard.canActivate(createContext({ conversation_id: 'conv-1' }, 'bad-signature')),
    (error) => error.message === 'Invalid ElevenLabs webhook signature.',
  );
});

test('ElevenLabsWebhookGuard accepts valid signatures', () => {
  const guard = createGuard();
  const body = { conversation_id: 'conv-1', event_type: 'conversation_started' };
  assert.equal(guard.canActivate(createContext(body)), true);
});
