import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from './twilio.service';
import { CallsService } from '../calls/calls.service';
import {
  callEndedPayload,
  incomingCallPayload,
} from '../../../test/fixtures/twilio-payloads';

describe('TwilioService', () => {
  let service: TwilioService;
  const configService = {
    get: jest.fn(),
  };
  const callsService = {
    createFromTwilio: jest.fn(),
    markCompleted: jest.fn(),
  };

  beforeEach(async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.baseUrl') {
        return 'https://portal.example.com';
      }

      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: CallsService,
          useValue: callsService,
        },
      ],
    }).compile();

    service = module.get<TwilioService>(TwilioService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a call record and returns TwiML with the stream destination', async () => {
    callsService.createFromTwilio.mockResolvedValue(undefined);

    const twiml = await service.handleIncomingCall(incomingCallPayload);

    expect(callsService.createFromTwilio).toHaveBeenCalledWith({
      twilioCallSid: incomingCallPayload.CallSid,
      callerNumber: incomingCallPayload.From,
      receiverNumber: incomingCallPayload.To,
    });
    expect(twiml).toContain(
      'Hello, you are now connected to the AI assistant.',
    );
    expect(twiml).toContain('wss://portal.example.com/voice/stream');
  });

  it('returns TwiML even when the incoming payload has no CallSid', async () => {
    const twiml = await service.handleIncomingCall({
      From: '+15550003333',
      To: '+15550004444',
    });

    expect(callsService.createFromTwilio).not.toHaveBeenCalled();
    expect(twiml).toContain('wss://portal.example.com/voice/stream');
  });

  it('marks the call completed with a numeric duration', async () => {
    callsService.markCompleted.mockResolvedValue(undefined);

    await expect(service.handleCallEnded(callEndedPayload)).resolves.toEqual({
      success: true,
      message: 'Call ended webhook received',
    });

    expect(callsService.markCompleted).toHaveBeenCalledWith('CA123456789', 42);
  });

  it('does not mark a call completed when CallSid is missing', async () => {
    await service.handleCallEnded({ CallDuration: '10' });

    expect(callsService.markCompleted).not.toHaveBeenCalled();
  });
});
