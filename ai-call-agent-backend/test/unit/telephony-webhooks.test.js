const assert = require('node:assert/strict');
const test = require('node:test');
const { TwilioService } = require('../../dist/modules/twilio/twilio.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createService({ telephony = {}, calls = {} } = {}) {
  const telephonyPort = {
    providerName: 'twilio',
    buildIncomingCallResponse: () => '<Response />',
    validateWebhook: () => true,
    ...telephony,
  };
  const callsService = {
    createFromProvider: async () => ({}),
    recordProviderEvent: async () => true,
    markCompleted: async () => undefined,
    markFailed: async () => undefined,
    ...calls,
  };
  return new TwilioService(telephonyPort, callsService);
}

test('handleIncomingCall creates call and records call-started event', async () => {
  const events = [];
  const service = createService({
    calls: {
      recordProviderEvent: async (input) => {
        events.push(input);
        return true;
      },
    },
  });

  const twiml = await service.handleIncomingCall({
    CallSid: 'CA100',
    From: '+15550001111',
    To: '+15550002222',
  });

  assert.equal(twiml, '<Response />');
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, 'call-started');
  assert.equal(events[0].externalEventId, 'CA100:call-started');
});

test('handleIncomingCall rejects missing CallSid', async () => {
  const service = createService();
  await assert.rejects(
    () => service.handleIncomingCall({ From: '+1', To: '+2' }),
    (error) =>
      error instanceof ApplicationError &&
      error.code === 'INVALID_WEBHOOK_PAYLOAD',
  );
});

test('handleCallEnded is idempotent when provider event already exists', async () => {
  let markCompletedCalls = 0;
  const service = createService({
    calls: {
      recordProviderEvent: async () => false,
      markCompleted: async () => {
        markCompletedCalls += 1;
      },
    },
  });

  await service.handleCallEnded({
    CallSid: 'CA200',
    CallStatus: 'completed',
    CallDuration: '30',
    Timestamp: '2026-08-28T10:00:00Z',
  });

  assert.equal(markCompletedCalls, 0);
});

test('handleCallEnded marks completed on first event', async () => {
  let markCompletedCalls = 0;
  const service = createService({
    calls: {
      recordProviderEvent: async () => true,
      markCompleted: async (_provider, callSid, duration) => {
        markCompletedCalls += 1;
        assert.equal(callSid, 'CA200');
        assert.equal(duration, 30);
      },
    },
  });

  await service.handleCallEnded({
    CallSid: 'CA200',
    CallStatus: 'completed',
    CallDuration: '30',
    Timestamp: '2026-08-28T10:00:00Z',
  });

  assert.equal(markCompletedCalls, 1);
});

test('handleStatusCallback marks failed terminal statuses once', async () => {
  let markFailedCalls = 0;
  const service = createService({
    calls: {
      recordProviderEvent: async () => true,
      markFailed: async (_provider, callSid, reason) => {
        markFailedCalls += 1;
        assert.equal(callSid, 'CA300');
        assert.equal(reason, 'no-answer');
      },
    },
  });

  await service.handleStatusCallback({
    CallSid: 'CA300',
    CallStatus: 'no-answer',
    SequenceNumber: '3',
  });

  assert.equal(markFailedCalls, 1);
});

test('handleStatusCallback skips duplicate terminal transitions', async () => {
  let markFailedCalls = 0;
  const service = createService({
    calls: {
      recordProviderEvent: async () => false,
      markFailed: async () => {
        markFailedCalls += 1;
      },
    },
  });

  await service.handleStatusCallback({
    CallSid: 'CA300',
    CallStatus: 'failed',
    SequenceNumber: '4',
  });

  assert.equal(markFailedCalls, 0);
});

test('validateWebhook delegates to telephony provider port', () => {
  let delegated = false;
  const service = createService({
    telephony: {
      validateWebhook: (url, params, signature) => {
        delegated = true;
        assert.equal(url, 'https://api.example.com/hook');
        assert.deepEqual(params, { CallSid: 'CA1' });
        assert.equal(signature, 'sig');
        return true;
      },
    },
  });

  assert.equal(
    service.validateWebhook('https://api.example.com/hook', { CallSid: 'CA1' }, 'sig'),
    true,
  );
  assert.equal(delegated, true);
});
