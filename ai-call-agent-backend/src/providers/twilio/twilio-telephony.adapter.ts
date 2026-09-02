import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio, { twiml, validateRequest } from 'twilio';
import type { LocalInstance } from 'twilio/lib/rest/api/v2010/account/availablePhoneNumberCountry/local';
import type { IncomingPhoneNumberInstance } from 'twilio/lib/rest/api/v2010/account/incomingPhoneNumber';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  IncomingCallContext,
  TelephonyNumberCandidate,
  TelephonyNumberConfigureInput,
  TelephonyNumberPurchaseInput,
  TelephonyNumberPurchaseResult,
  TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import { TelephonyMappingsService } from '../../modules/twilio/telephony-mappings.service';
import { VoiceStreamTokenService } from '../../modules/voice-stream/voice-stream-token.service';

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  timeoutMs: number;
};

@Injectable()
export class TwilioTelephonyAdapter implements TelephonyProviderPort {
  readonly providerName = 'twilio';
  private readonly logger = new Logger(TwilioTelephonyAdapter.name);

  constructor(
    private readonly config: ConfigService,
    private readonly mappings: TelephonyMappingsService,
    private readonly streamTokens: VoiceStreamTokenService,
  ) {}

  isConfigured(): boolean {
    const cfg = this.readConfig(false);
    return Boolean(cfg?.accountSid && cfg?.authToken);
  }

  async validateCredentials(): Promise<
    { ok: true } | { ok: false; reason: string }
  > {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'Twilio credentials are not configured.' };
    }

    try {
      const cfg = this.readConfig(true);
      const client = this.createClient(cfg);
      await client.api.accounts(cfg.accountSid).fetch();
      return { ok: true };
    } catch (error) {
      const message = this.extractRestMessage(error);
      this.logger.warn(`Twilio credential validation failed: ${message}`);
      return {
        ok: false,
        reason: message ?? 'Twilio rejected the server credentials.',
      };
    }
  }

  async searchAvailableNumbers(input: {
    isoCountry: string;
    areaCode?: string;
    contains?: string;
    limit?: number;
  }): Promise<TelephonyNumberCandidate[]> {
    this.requireConfigured();
    const cfg = this.readConfig(true);
    const client = this.createClient(cfg);
    const isoCountry = input.isoCountry.trim().toUpperCase();
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

    try {
      const results = await client
        .availablePhoneNumbers(isoCountry)
        .local.list({
          areaCode: input.areaCode
            ? Number.parseInt(input.areaCode, 10)
            : undefined,
          contains: input.contains?.trim() || undefined,
          voiceEnabled: true,
          limit,
        });

      return results.map((row) => this.toCandidate(row, isoCountry));
    } catch (error) {
      throw this.mapRestError(error, {
        defaultCode: 'TELEPHONY_SEARCH_FAILED',
        defaultMessage: 'Unable to search available phone numbers.',
      });
    }
  }

  async purchaseNumber(
    input: TelephonyNumberPurchaseInput,
  ): Promise<TelephonyNumberPurchaseResult> {
    this.requireConfigured();
    const cfg = this.readConfig(true);
    const client = this.createClient(cfg);
    const phoneNumber = input.phoneNumber.trim();

    let created: IncomingPhoneNumberInstance;
    try {
      created = await client.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: input.friendlyName?.trim().slice(0, 64) || undefined,
      });
    } catch (error) {
      throw this.mapRestError(error, {
        defaultCode: 'TELEPHONY_NUMBER_UNAVAILABLE',
        defaultMessage: 'This phone number is no longer available to purchase.',
        unavailableOn: [400, 404, 409],
      });
    }

    const urls = this.defaultWebhookUrls();
    await this.configureNumber({
      externalNumberId: created.sid,
      voiceWebhookUrl: urls.voiceWebhookUrl,
      statusCallbackUrl: urls.statusCallbackUrl,
    });

    await this.mappings.recordActiveMapping({
      provider: this.providerName,
      externalResourceId: created.sid,
      phoneNumber: created.phoneNumber,
      metadata: {
        friendlyName: created.friendlyName ?? input.friendlyName ?? null,
      },
    });

    return {
      externalNumberId: created.sid,
      phoneNumber: created.phoneNumber,
      configured: true,
    };
  }

  async lookupProvisionedNumber(
    phoneNumber: string,
  ): Promise<TelephonyNumberPurchaseResult> {
    this.requireConfigured();
    const cfg = this.readConfig(true);
    const client = this.createClient(cfg);
    const normalized = phoneNumber.trim();

    try {
      const rows = await client.incomingPhoneNumbers.list({
        phoneNumber: normalized,
        limit: 1,
      });
      const row = rows[0];
      if (!row) {
        throw new ApplicationError(
          'PHONE_NUMBER_NOT_AT_PROVIDER',
          'This phone number is not provisioned in the telephony provider account.',
          404,
        );
      }

      return {
        externalNumberId: row.sid,
        phoneNumber: row.phoneNumber,
        configured: false,
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.mapRestError(error, {
        defaultCode: 'TELEPHONY_PROVISION_FAILED',
        defaultMessage: 'Unable to look up the phone number with the provider.',
        notFoundCode: 'PHONE_NUMBER_NOT_AT_PROVIDER',
      });
    }
  }

  async configureNumber(input: TelephonyNumberConfigureInput): Promise<void> {
    this.requireConfigured();
    const cfg = this.readConfig(true);
    const client = this.createClient(cfg);

    try {
      await client.incomingPhoneNumbers(input.externalNumberId).update({
        voiceUrl: input.voiceWebhookUrl,
        voiceMethod: 'POST',
        statusCallback: input.statusCallbackUrl,
        statusCallbackMethod: 'POST',
        ...(input.smsWebhookUrl
          ? { smsUrl: input.smsWebhookUrl, smsMethod: 'POST' as const }
          : {}),
      });
    } catch (error) {
      throw this.mapRestError(error, {
        defaultCode: 'TELEPHONY_PROVISION_FAILED',
        defaultMessage:
          'Unable to configure the phone number with the provider.',
        notFoundCode: 'TELEPHONY_NUMBER_NOT_FOUND',
      });
    }
  }

  async releaseNumber(externalNumberId: string): Promise<void> {
    this.requireConfigured();
    const cfg = this.readConfig(true);
    const client = this.createClient(cfg);

    try {
      await client.incomingPhoneNumbers(externalNumberId).remove();
    } catch (error) {
      const status = this.restStatus(error);
      if (status === 404) {
        await this.mappings.markReleased(this.providerName, externalNumberId);
        return;
      }
      throw this.mapRestError(error, {
        defaultCode: 'TELEPHONY_PROVISION_FAILED',
        defaultMessage: 'Unable to release the phone number with the provider.',
      });
    }

    await this.mappings.markReleased(this.providerName, externalNumberId);
  }

  validateWebhook(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean {
    const authToken = this.config.get<string>('twilio.authToken');
    return Boolean(
      authToken &&
      signature &&
      validateRequest(authToken, signature, url, params),
    );
  }

  buildIncomingCallResponse(context: IncomingCallContext): string {
    const baseUrl = this.config.getOrThrow<string>('app.publicBaseUrl');
    const streamUrl = new URL('/voice/stream', baseUrl);
    streamUrl.protocol = streamUrl.protocol === 'https:' ? 'wss:' : 'ws:';

    const response = new twiml.VoiceResponse();
    response.say(
      { voice: 'alice' },
      'Hello, you are now connected to the EaziAiCall assistant.',
    );
    const stream = response.connect().stream({ url: streamUrl.toString() });
    stream.parameter({
      name: 'token',
      value: this.streamTokens.create(context.externalCallId),
    });
    return response.toString();
  }

  defaultWebhookUrls(): {
    voiceWebhookUrl: string;
    statusCallbackUrl: string;
  } {
    const baseUrl = this.config
      .getOrThrow<string>('app.publicBaseUrl')
      .replace(/\/$/, '');
    return {
      voiceWebhookUrl: `${baseUrl}/api/v1/webhooks/twilio/incoming-call`,
      statusCallbackUrl: `${baseUrl}/api/v1/webhooks/twilio/status-callback`,
    };
  }

  private toCandidate(
    row: LocalInstance,
    isoCountry: string,
  ): TelephonyNumberCandidate {
    return {
      externalNumberId: row.phoneNumber,
      phoneNumber: row.phoneNumber,
      friendlyName: row.friendlyName ?? undefined,
      locality: row.locality ?? undefined,
      region: row.region ?? undefined,
      isoCountry,
      capabilities: {
        voice: Boolean(row.capabilities?.voice),
        sms: Boolean(row.capabilities?.sms),
        mms: Boolean(row.capabilities?.mms),
      },
    };
  }

  private readConfig(required: true): TwilioConfig;
  private readConfig(required: false): TwilioConfig | null;
  private readConfig(required: boolean): TwilioConfig | null {
    const accountSid = this.config.get<string>('twilio.accountSid')?.trim();
    const authToken = this.config.get<string>('twilio.authToken')?.trim();
    if (!accountSid || !authToken) {
      if (required) {
        throw new ApplicationError(
          'PROVIDER_NOT_CONFIGURED',
          'Twilio is not configured on the server.',
          503,
        );
      }
      return null;
    }
    return {
      accountSid,
      authToken,
      timeoutMs: this.config.get<number>('twilio.timeoutMs') ?? 20_000,
    };
  }

  private requireConfigured(): void {
    this.readConfig(true);
  }

  private createClient(cfg: TwilioConfig) {
    return twilio(cfg.accountSid, cfg.authToken, {
      autoRetry: true,
      maxRetries: 2,
      timeout: cfg.timeoutMs,
    });
  }

  private mapRestError(
    error: unknown,
    options: {
      defaultCode: string;
      defaultMessage: string;
      notFoundCode?: string;
      unavailableOn?: number[];
    },
  ): ApplicationError {
    const status = this.restStatus(error);
    const message = this.extractRestMessage(error);

    if (status === 401 || status === 403) {
      return new ApplicationError(
        'PROVIDER_AUTH_FAILED',
        message ?? 'The telephony provider rejected the server credentials.',
        502,
      );
    }
    if (status === 429) {
      return new ApplicationError(
        'PROVIDER_RATE_LIMITED',
        'The telephony provider is busy. Please try again shortly.',
        503,
      );
    }
    if (status === 404 && options.notFoundCode) {
      return new ApplicationError(
        options.notFoundCode,
        message ?? 'The phone number was not found at the provider.',
        404,
      );
    }
    if (status && options.unavailableOn?.includes(status)) {
      return new ApplicationError(
        'TELEPHONY_NUMBER_UNAVAILABLE',
        message ?? options.defaultMessage,
        409,
      );
    }

    this.logger.warn(
      `Twilio REST error status=${status ?? 'unknown'} message=${message ?? 'unknown'}`,
    );
    return new ApplicationError(
      options.defaultCode,
      message ?? options.defaultMessage,
      status === 400 ? 400 : 502,
    );
  }

  private restStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') {
      return undefined;
    }
    const status = (error as { status?: number }).status;
    return typeof status === 'number' ? status : undefined;
  }

  private extractRestMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') {
      return null;
    }
    const row = error as { message?: string; moreInfo?: string };
    const parts = [row.message, row.moreInfo].filter((value): value is string =>
      Boolean(value?.trim()),
    );
    return parts.length > 0 ? parts.join(' ') : null;
  }
}
