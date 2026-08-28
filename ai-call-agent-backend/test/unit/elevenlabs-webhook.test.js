const assert = require('node:assert/strict');
const test = require('node:test');
const {
  ElevenLabsWebhookService,
} = require('../../dist/modules/calls/elevenlabs-webhook.service');

function createService(lifecycle = {}) {
  const lifecycleService = {
    findExistingByTwilioSid: async () => ({
      id: 'call-1',
      twilioCallSid: 'CA100',
    }),
    linkProviderCallId: async () => undefined,
    recordProviderEvent: async () => true,
    markInProgress: async () => undefined,
    markCompleted: async () => undefined,
    markFailed: async () => undefined,
    appendCallEvent: async () => true,
    ...lifecycle,
  };
  return new ElevenLabsWebhookService(lifecycleService);
}

test('handleConversationEvent links ElevenLabs conversation id to call', async () => {
  let linked = null;
  const service = createService({
    linkProviderCallId: async (callId, provider, externalCallId) => {
      linked = { callId, provider, externalCallId };
    },
  });

  await service.handleConversationEvent({
    conversation_id: 'conv-123',
    call_sid: 'CA100',
    event_type: 'conversation_started',
  });

  assert.deepEqual(linked, {
    callId: 'call-1',
    provider: 'elevenlabs',
    externalCallId: 'conv-123',
  });
});

test('handleConversationEvent is idempotent when provider event already exists', async () => {
  let markInProgressCalls = 0;
  const service = createService({
    recordProviderEvent: async () => false,
    markInProgress: async () => {
      markInProgressCalls += 1;
    },
  });

  await service.handleConversationEvent({
    conversation_id: 'conv-123',
    call_sid: 'CA100',
    event_type: 'conversation_started',
  });

  assert.equal(markInProgressCalls, 0);
});

test('handleConversationEvent marks provider failure on error events', async () => {
  let markFailedCalls = 0;
  const service = createService({
    markFailed: async (_provider, callSid, reason, failureCode) => {
      markFailedCalls += 1;
      assert.equal(callSid, 'CA100');
      assert.equal(reason, 'conversation_error');
      assert.equal(failureCode, 'PROVIDER_UNAVAILABLE');
    },
  });

  await service.handleConversationEvent({
    conversation_id: 'conv-123',
    call_sid: 'CA100',
    event_type: 'conversation_error',
  });

  assert.equal(markFailedCalls, 1);
});
