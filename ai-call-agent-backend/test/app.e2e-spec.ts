import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TwilioController } from '../src/modules/twilio/twilio.controller';
import { TwilioService } from '../src/modules/twilio/twilio.service';

describe('TwilioController (e2e)', () => {
  let app: INestApplication<App>;
  const twilioService = {
    handleIncomingCall: jest.fn(),
    handleCallEnded: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TwilioController],
      providers: [
        {
          provide: TwilioService,
          useValue: twilioService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns TwiML with a text/xml response for incoming calls', async () => {
    twilioService.handleIncomingCall.mockResolvedValue('<Response />');

    await request(app.getHttpServer())
      .post('/webhooks/twilio/incoming-call')
      .send({ CallSid: 'CA-e2e-1' })
      .expect(201)
      .expect('Content-Type', /text\/xml/)
      .expect('<Response />');

    expect(twilioService.handleIncomingCall).toHaveBeenCalledWith({
      CallSid: 'CA-e2e-1',
    });
  });
});
