import { Test, TestingModule } from '@nestjs/testing';
import { TwilioService } from './twilio.service';
import { CallsService } from '../calls/calls.service';
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
  const callsService = {
    createFromProvider: jest.fn(),
    recordProviderEvent: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    callsService.recordProviderEvent.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioService,
        { provide: TELEPHONY_PROVIDER_PORT, useValue: telephony },
        { provide: CallsService, useValue: callsService },
      ],
    }).compile();

    service = module.get(TwilioService);
  });

  it('creates a call record and returns TwiML from the provider port', async () => {
    const twiml = await service.handleIncomingCall(incomingCallPayload);

    expect(callsService.createFromProvider).toHaveBeenCalledWith({
      provider: 'twilio',
      externalCallId: incomingCallPayload.CallSid,
      callerNumber: incomingCallPayload.From,
      receiverNumber: incomingCallPayload.To,
    });
    expect(callsService.recordProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'call-started',
        externalEventId: `${incomingCallPayload.CallSid}:call-started`,
      }),
    );
    expect(telephony.buildIncomingCallResponse).toHaveBeenCalled();
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
    await expect(service.handleCallEnded(callEndedPayload)).resolves.toEqual({
      success: true,
    });

    expect(callsService.markCompleted).toHaveBeenCalledWith(
      'twilio',
      callEndedPayload.CallSid,
      42,
    );
  });

  it('marks failed calls from status callbacks', async () => {
    await expect(
      service.handleStatusCallback(statusCallbackFailedPayload),
    ).resolves.toEqual({ success: true });

    expect(callsService.markFailed).toHaveBeenCalledWith(
      'twilio',
      statusCallbackFailedPayload.CallSid,
      'failed',
    );
  });
});
