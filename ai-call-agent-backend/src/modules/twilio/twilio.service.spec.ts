import { Test, TestingModule } from '@nestjs/testing';
import { TwilioService } from './twilio.service';
import { CallLifecycleService } from '../calls/call-lifecycle.service';
import { InboundCallOrchestratorService } from '../calls/inbound-call-orchestrator.service';
import { TELEPHONY_PROVIDER_PORT } from '../../providers/telephony-provider.port';
import {
  callEndedPayload,
  incomingCallPayload,
  statusCallbackFailedPayload,
} from '../../../test/fixtures/twilio-payloads';

describe('TwilioService', () => {
  let service: TwilioService;
  const telephony = {
    providerName: 'twilio',
    buildIncomingCallResponse: jest.fn(() => '<Response />'),
    validateWebhook: jest.fn(() => true),
  };
  const lifecycle = {
    findExistingByTwilioSid: jest.fn(),
    recordProviderEvent: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    markInProgress: jest.fn(),
    appendCallEvent: jest.fn(),
  };
  const orchestrator = {
    handleTwilioInbound: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    lifecycle.findExistingByTwilioSid.mockResolvedValue(null);
    lifecycle.recordProviderEvent.mockResolvedValue(true);
    orchestrator.handleTwilioInbound.mockResolvedValue('<Response />');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioService,
        { provide: TELEPHONY_PROVIDER_PORT, useValue: telephony },
        { provide: CallLifecycleService, useValue: lifecycle },
        { provide: InboundCallOrchestratorService, useValue: orchestrator },
      ],
    }).compile();

    service = module.get(TwilioService);
  });

  it('delegates incoming calls to the orchestrator', async () => {
    const twiml = await service.handleIncomingCall(incomingCallPayload);

    expect(orchestrator.handleTwilioInbound).toHaveBeenCalledWith(
      incomingCallPayload,
    );
    expect(twiml).toBe('<Response />');
  });

  it('rejects incoming calls without CallSid', async () => {
    await expect(
      service.handleIncomingCall({
        From: '+15550003333',
        To: '+15550004444',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_WEBHOOK_PAYLOAD' });
  });

  it('marks the call completed on call-ended events', async () => {
    lifecycle.findExistingByTwilioSid.mockResolvedValue({
      id: 'call-1',
      twilioCallSid: callEndedPayload.CallSid,
    });

    await expect(service.handleCallEnded(callEndedPayload)).resolves.toEqual({
      success: true,
    });

    expect(lifecycle.markCompleted).toHaveBeenCalledWith(
      'twilio',
      callEndedPayload.CallSid,
      42,
    );
  });

  it('marks failed calls from status callbacks', async () => {
    lifecycle.findExistingByTwilioSid.mockResolvedValue({
      id: 'call-1',
      twilioCallSid: statusCallbackFailedPayload.CallSid,
    });

    await expect(
      service.handleStatusCallback(statusCallbackFailedPayload),
    ).resolves.toEqual({ success: true });

    expect(lifecycle.markFailed).toHaveBeenCalledWith(
      'twilio',
      statusCallbackFailedPayload.CallSid,
      'failed',
    );
  });
});
