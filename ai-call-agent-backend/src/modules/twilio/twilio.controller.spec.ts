import { Test, TestingModule } from '@nestjs/testing';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';

describe('TwilioController', () => {
  let controller: TwilioController;
  const twilioService = {
    handleIncomingCall: jest.fn(),
    handleCallEnded: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwilioController],
      providers: [
        {
          provide: TwilioService,
          useValue: twilioService,
        },
      ],
    }).compile();

    controller = module.get<TwilioController>(TwilioController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates incoming-call requests to the service', async () => {
    twilioService.handleIncomingCall.mockResolvedValue('<Response />');

    await expect(
      controller.handleIncomingCall({ CallSid: 'CA-1' }),
    ).resolves.toBe('<Response />');

    expect(twilioService.handleIncomingCall).toHaveBeenCalledWith({
      CallSid: 'CA-1',
    });
  });

  it('delegates call-ended requests to the service', async () => {
    twilioService.handleCallEnded.mockResolvedValue({
      success: true,
      message: 'Call ended webhook received',
    });

    await expect(
      controller.handleCallEnded({ CallSid: 'CA-1' }),
    ).resolves.toEqual({
      success: true,
      message: 'Call ended webhook received',
    });

    expect(twilioService.handleCallEnded).toHaveBeenCalledWith({
      CallSid: 'CA-1',
    });
  });
});
