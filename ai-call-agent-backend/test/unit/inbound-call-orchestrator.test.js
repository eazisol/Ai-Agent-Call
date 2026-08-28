const assert = require('node:assert/strict');
const test = require('node:test');
const {
  InboundCallOrchestratorService,
} = require('../../dist/modules/calls/inbound-call-orchestrator.service');

function createOrchestrator({
  routing = {},
  lifecycle = {},
  handoff = {},
  telephony = {},
  config = {},
} = {}) {
  const routingService = {
    resolve: async () => ({
      ok: true,
      context: {
        phoneNumberId: 'phone-1',
        phoneNumberE164: '+14155550100',
        businessId: 'biz-1',
        agentId: 'agent-1',
        agentName: 'Receptionist',
        externalAgentId: 'el-agent-1',
        greeting: 'Hello',
      },
    }),
    ...routing,
  };
  const lifecycleService = {
    findExistingByTwilioSid: async () => null,
    recordProviderEvent: async () => true,
    persistRoutingFailure: async (input) => ({
      id: 'call-failed-1',
      status: 'failed',
      failureCode: input.failure.code,
      twilioCallSid: input.twilioCallSid,
    }),
    persistSuccessfulRouting: async (input) => ({
      id: 'call-1',
      status: 'started',
      twilioCallSid: input.twilioCallSid,
      business: { id: input.context.businessId },
      agent: { id: input.context.agentId },
    }),
    appendCallEvent: async () => true,
    markFailed: async () => undefined,
    ...lifecycle,
  };
  const handoffPort = {
    isConfigured: () => true,
    buildConnectResponse: async () => '<Response><Connect /></Response>',
    buildFailureResponse: ({ safeMessage }) =>
      `<Response><Say>${safeMessage}</Say></Response>`,
    ...handoff,
  };
  const telephonyPort = {
    providerName: 'twilio',
    buildIncomingCallResponse: () => '<Response><Say>Dev fallback</Say></Response>',
    ...telephony,
  };
  const configService = {
    get: (key) => {
      if (key === 'inboundCall.devStreamFallback') return false;
      return undefined;
    },
    ...config,
  };

  return new InboundCallOrchestratorService(
    routingService,
    lifecycleService,
    handoffPort,
    telephonyPort,
    configService,
  );
}

test('handleTwilioInbound persists routing failure and returns safe TwiML', async () => {
  let persistedFailure = null;
  let failureEvents = 0;
  const orchestrator = createOrchestrator({
    routing: {
      resolve: async () => ({
        ok: false,
        failure: {
          code: 'UNASSIGNED_NUMBER',
          stage: 'assignment_lookup',
          safeMessage: 'This line is not configured.',
          businessId: 'biz-1',
          phoneNumberId: 'phone-1',
        },
      }),
    },
    lifecycle: {
      persistRoutingFailure: async (input) => {
        persistedFailure = input;
        return { id: 'call-failed-1', status: 'failed' };
      },
      appendCallEvent: async () => {
        failureEvents += 1;
        return true;
      },
    },
  });

  const twiml = await orchestrator.handleTwilioInbound({
    CallSid: 'CA-unassigned',
    From: '+15550001111',
    To: '+14155550100',
  });

  assert.equal(persistedFailure.failure.code, 'UNASSIGNED_NUMBER');
  assert.equal(failureEvents, 2);
  assert.match(twiml, /not configured/i);
});

test('handleTwilioInbound is idempotent for duplicate CallSid', async () => {
  let persistCalls = 0;
  const orchestrator = createOrchestrator({
    lifecycle: {
      findExistingByTwilioSid: async () => ({
        id: 'call-existing',
        status: 'started',
        twilioCallSid: 'CA-dup',
        business: { id: 'biz-1' },
        agent: { id: 'agent-1' },
      }),
      persistSuccessfulRouting: async () => {
        persistCalls += 1;
        return { id: 'call-new' };
      },
    },
  });

  const twiml = await orchestrator.handleTwilioInbound({
    CallSid: 'CA-dup',
    From: '+15550001111',
    To: '+14155550100',
  });

  assert.equal(persistCalls, 0);
  assert.match(twiml, /Connect/);
});

test('handleTwilioInbound marks handoff failure when provider is unavailable', async () => {
  let markFailedCalls = 0;
  const orchestrator = createOrchestrator({
    handoff: {
      isConfigured: () => false,
      buildFailureResponse: ({ safeMessage }) =>
        `<Response><Say>${safeMessage}</Say></Response>`,
    },
    lifecycle: {
      markFailed: async (_provider, callSid, _reason, failureCode) => {
        markFailedCalls += 1;
        assert.equal(callSid, 'CA-handoff-fail');
        assert.equal(failureCode, 'HANDOFF_FAILED');
      },
    },
  });

  const twiml = await orchestrator.handleTwilioInbound({
    CallSid: 'CA-handoff-fail',
    From: '+15550001111',
    To: '+14155550100',
  });

  assert.equal(markFailedCalls, 1);
  assert.match(twiml, /could not connect/i);
});
