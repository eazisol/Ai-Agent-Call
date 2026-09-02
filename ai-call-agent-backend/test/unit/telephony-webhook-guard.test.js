const assert = require('node:assert/strict');
const test = require('node:test');
const {
  TwilioWebhookGuard,
} = require('../../dist/modules/twilio/twilio-webhook.guard');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createGuard({
  validateSignatures = true,
  validateWebhookResult = true,
} = {}) {
  const config = {
    get: (key) => {
      if (key === 'twilio.validateSignatures') return validateSignatures;
      return undefined;
    },
    getOrThrow: (key) => {
      if (key === 'app.publicBaseUrl') return 'https://api.example.com';
      throw new Error(`missing ${key}`);
    },
  };
  const twilio = {
    validateWebhook: () => validateWebhookResult,
  };
  return new TwilioWebhookGuard(config, twilio);
}

function createContext(
  body = { CallSid: 'CA1' },
  signature = 'valid-signature',
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name) =>
          name.toLowerCase() === 'x-twilio-signature' ? signature : undefined,
        originalUrl: '/api/v1/webhooks/twilio/incoming-call',
        body,
      }),
    }),
  };
}

test('TwilioWebhookGuard bypasses validation when TWILIO_VALIDATE_SIGNATURES=false', () => {
  const guard = createGuard({ validateSignatures: false });
  assert.equal(guard.canActivate(createContext()), true);
});

test('TwilioWebhookGuard rejects invalid signatures', () => {
  const guard = createGuard({ validateWebhookResult: false });
  assert.throws(
    () => guard.canActivate(createContext()),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVALID_WEBHOOK_SIGNATURE',
  );
});

test('TwilioWebhookGuard accepts valid signatures', () => {
  const guard = createGuard({ validateWebhookResult: true });
  assert.equal(guard.canActivate(createContext()), true);
});
