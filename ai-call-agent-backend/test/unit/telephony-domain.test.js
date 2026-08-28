const assert = require('node:assert/strict');
const test = require('node:test');
const {
  TwilioTelephonyAdapter,
} = require('../../dist/providers/twilio/twilio-telephony.adapter');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createAdapterHarness({
  accountSid = 'AC_test',
  authToken = 'auth_test',
  publicBaseUrl = 'https://api.example.com',
  mappings = {},
} = {}) {
  const mappingCalls = {
    recordActiveMapping: async (input) => ({ id: 'map-1', ...input }),
    markReleased: async () => undefined,
    ...mappings,
  };

  const config = {
    get(key) {
      if (key === 'twilio.accountSid') return accountSid;
      if (key === 'twilio.authToken') return authToken;
      if (key === 'twilio.timeoutMs') return 20_000;
      return undefined;
    },
    getOrThrow(key) {
      if (key === 'app.publicBaseUrl') return publicBaseUrl;
      throw new Error(`missing ${key}`);
    },
  };

  return new TwilioTelephonyAdapter(
    config,
    mappingCalls,
    { create: () => 'token' },
  );
}

test('TwilioTelephonyAdapter isConfigured requires sid and token', () => {
  const configured = createAdapterHarness();
  assert.equal(configured.isConfigured(), true);

  const missing = createAdapterHarness({ accountSid: '', authToken: '' });
  assert.equal(missing.isConfigured(), false);
});

test('TwilioTelephonyAdapter buildIncomingCallResponse uses provider port stream token', () => {
  const adapter = createAdapterHarness();
  const xml = adapter.buildIncomingCallResponse({
    externalCallId: 'CA-100',
  });
  assert.match(xml, /Response/);
});

test('TwilioTelephonyAdapter defaultWebhookUrls point at platform routes', () => {
  const adapter = createAdapterHarness();
  assert.deepEqual(adapter.defaultWebhookUrls(), {
    voiceWebhookUrl:
      'https://api.example.com/api/v1/webhooks/twilio/incoming-call',
    statusCallbackUrl:
      'https://api.example.com/api/v1/webhooks/twilio/status-callback',
  });
});

test('TwilioTelephonyAdapter searchAvailableNumbers throws when not configured', async () => {
  const adapter = createAdapterHarness({ accountSid: '', authToken: '' });
  await assert.rejects(
    () => adapter.searchAvailableNumbers({ isoCountry: 'US' }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'PROVIDER_NOT_CONFIGURED',
  );
});

test('TwilioTelephonyAdapter validateWebhook returns false without auth token', () => {
  const adapter = createAdapterHarness({ authToken: '' });
  assert.equal(
    adapter.validateWebhook(
      'https://api.example.com/api/v1/webhooks/twilio/incoming-call',
      { CallSid: 'CA1' },
      'signature',
    ),
    false,
  );
});

test('TwilioTelephonyAdapter validateCredentials reports missing configuration', async () => {
  const adapter = createAdapterHarness({ accountSid: '', authToken: '' });
  const result = await adapter.validateCredentials();
  assert.deepEqual(result, {
    ok: false,
    reason: 'Twilio credentials are not configured.',
  });
});
