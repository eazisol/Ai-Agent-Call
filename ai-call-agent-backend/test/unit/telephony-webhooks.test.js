const assert = require('node:assert/strict');
const test = require('node:test');
const { TwilioService } = require('../../dist/modules/twilio/twilio.service');
const {
  ApplicationError,
} = require('../../dist/common/errors/application-error');

function createService({
  telephony = {},
  lifecycle = {},
  orchestrator = {},
} = {}) {
  const telephonyPort = {
    providerName: 'twilio',
    buildIncomingCallResponse: () => '<Response />',
    validateWebhook: () => true,
    ...telephony,
  };
  const lifecycleService = {
    findExistingByTwilioSid: async () => null,
    recordProviderEvent: async () => true,
    markCompleted: async () => undefined,
    markFailed: async () => undefined,
    markInProgress: async () => undefined,
    appendCallEvent: async () => true,
    ...lifecycle,
  };
  const orchestratorService = {
    handleTwilioInbound: async () => '<Response />',
    ...orchestrator,
  };
  return new TwilioService(
    telephonyPort,
    lifecycleService,
    orchestratorService,
  );
}

test('handleIncomingCall delegates to orchestrator', async () => {
  let orchestrated = false;
  const service = createService({
    orchestrator: {
      handleTwilioInbound: async (body) => {
        orchestrated = true;
        assert.equal(body.CallSid, 'CA100');
        return '<Response><Say>Hi</Say></Response>';
      },
    },
  });

  const twiml = await service.handleIncomingCall({
    CallSid: 'CA100',
    From: '+15550001111',
    To: '+15550002222',
  });

  assert.equal(orchestrated, true);
  assert.match(twiml, /Hi/);
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
    lifecycle: {
      findExistingByTwilioSid: async () => ({
        id: 'call-1',
        twilioCallSid: 'CA200',
      }),
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
    lifecycle: {
      findExistingByTwilioSid: async () => ({
        id: 'call-1',
        twilioCallSid: 'CA200',
      }),
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

test('handleStatusCallback marks failed statuses', async () => {
  let markFailedCalls = 0;
  const service = createService({
    lifecycle: {
      findExistingByTwilioSid: async () => ({
        id: 'call-1',
        twilioCallSid: 'CA300',
      }),
      recordProviderEvent: async () => true,
      markFailed: async (_provider, callSid, reason) => {
        markFailedCalls += 1;
        assert.equal(callSid, 'CA300');
        assert.equal(reason, 'busy');
      },
    },
  });

  await service.handleStatusCallback({
    CallSid: 'CA300',
    CallStatus: 'busy',
    SequenceNumber: '1',
  });

  assert.equal(markFailedCalls, 1);
});
