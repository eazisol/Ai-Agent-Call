import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TwilioTelephonyAdapter } from './twilio-telephony.adapter';
import { TelephonyMappingsService } from '../modules/twilio/telephony-mappings.service';
import { VoiceStreamTokenService } from '../modules/voice-stream/voice-stream-token.service';

const mockLocalList = jest.fn();
const mockIncomingCreate = jest.fn();
const mockIncomingList = jest.fn();
const mockIncomingUpdate = jest.fn();
const mockIncomingRemove = jest.fn();
const mockAccountFetch = jest.fn();

jest.mock('twilio', () => {
  const validateRequest = jest.fn(() => true);
  const twiml = {
    VoiceResponse: jest.fn().mockImplementation(() => ({
      say: jest.fn().mockReturnThis(),
      connect: jest.fn().mockReturnValue({
        stream: jest.fn().mockReturnValue({
          parameter: jest.fn(),
        }),
      }),
      toString: jest.fn(() => '<Response />'),
    })),
  };

  const clientFactory = jest.fn(() => {
    const incomingPhoneNumbers = jest.fn((sid?: string) => ({
      update: mockIncomingUpdate,
      remove: mockIncomingRemove,
    }));
    (incomingPhoneNumbers as jest.Mock & { create: jest.Mock; list: jest.Mock }).create =
      mockIncomingCreate;
    (incomingPhoneNumbers as jest.Mock & { list: jest.Mock }).list =
      mockIncomingList;

    return {
      api: {
        accounts: jest.fn(() => ({ fetch: mockAccountFetch })),
      },
      availablePhoneNumbers: jest.fn(() => ({
        local: {
          list: mockLocalList,
        },
      })),
      incomingPhoneNumbers,
    };
  });

  return {
    __esModule: true,
    default: clientFactory,
    validateRequest,
    twiml,
  };
});

describe('TwilioTelephonyAdapter', () => {
  let adapter: TwilioTelephonyAdapter;
  const mappings = {
    recordActiveMapping: jest.fn(),
    markReleased: jest.fn(),
  };
  const streamTokens = {
    create: jest.fn(() => 'stream-token'),
  };
  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'twilio.accountSid') return 'AC_test';
      if (key === 'twilio.authToken') return 'auth_test';
      if (key === 'twilio.timeoutMs') return 20_000;
      return undefined;
    });
    configService.getOrThrow.mockImplementation((key: string) => {
      if (key === 'app.publicBaseUrl') return 'https://api.example.com';
      throw new Error(`missing ${key}`);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwilioTelephonyAdapter,
        { provide: ConfigService, useValue: configService },
        { provide: TelephonyMappingsService, useValue: mappings },
        { provide: VoiceStreamTokenService, useValue: streamTokens },
      ],
    }).compile();

    adapter = module.get(TwilioTelephonyAdapter);
  });

  it('reports configured when sid and token exist', () => {
    expect(adapter.isConfigured()).toBe(true);
  });

  it('searches available numbers and normalizes candidates', async () => {
    mockLocalList.mockResolvedValue([
      {
        phoneNumber: '+14155550100',
        friendlyName: 'Test',
        locality: 'San Francisco',
        region: 'CA',
        capabilities: { voice: true, sms: true, mms: false },
      },
    ]);

    const results = await adapter.searchAvailableNumbers({
      isoCountry: 'US',
      areaCode: '415',
      limit: 5,
    });

    expect(results).toEqual([
      expect.objectContaining({
        externalNumberId: '+14155550100',
        phoneNumber: '+14155550100',
        isoCountry: 'US',
        capabilities: { voice: true, sms: true, mms: false },
      }),
    ]);
  });

  it('purchases, configures, and records a provider mapping', async () => {
    mockIncomingCreate.mockResolvedValue({
      sid: 'PN123',
      phoneNumber: '+14155550100',
      friendlyName: 'Reception',
    });
    mockIncomingUpdate.mockResolvedValue({});

    const result = await adapter.purchaseNumber({
      phoneNumber: '+14155550100',
      friendlyName: 'Reception',
    });

    expect(result).toEqual({
      externalNumberId: 'PN123',
      phoneNumber: '+14155550100',
      configured: true,
    });
    expect(mockIncomingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceUrl: 'https://api.example.com/api/v1/webhooks/twilio/incoming-call',
        statusCallback:
          'https://api.example.com/api/v1/webhooks/twilio/status-callback',
      }),
    );
    expect(mappings.recordActiveMapping).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'twilio',
        externalResourceId: 'PN123',
        phoneNumber: '+14155550100',
      }),
    );
  });

  it('marks mapping released when provider returns 404 on release', async () => {
    mockIncomingRemove.mockRejectedValue({ status: 404, message: 'not found' });

    await expect(adapter.releaseNumber('PN404')).resolves.toBeUndefined();
    expect(mappings.markReleased).toHaveBeenCalledWith('twilio', 'PN404');
  });

  it('validates credentials via account fetch', async () => {
    mockAccountFetch.mockResolvedValue({ sid: 'AC_test' });

    await expect(adapter.validateCredentials()).resolves.toEqual({ ok: true });
  });

  it('looks up provisioned numbers by E.164', async () => {
    mockIncomingList.mockResolvedValue([
      { sid: 'PN999', phoneNumber: '+14155550999' },
    ]);

    await expect(
      adapter.lookupProvisionedNumber('+14155550999'),
    ).resolves.toEqual({
      externalNumberId: 'PN999',
      phoneNumber: '+14155550999',
      configured: false,
    });
  });

  it('throws when provisioned number is not found', async () => {
    mockIncomingList.mockResolvedValue([]);

    await expect(adapter.lookupProvisionedNumber('+14155550000')).rejects.toMatchObject(
      { code: 'PHONE_NUMBER_NOT_AT_PROVIDER' },
    );
  });
});
