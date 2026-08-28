import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TELEPHONY_PROVIDER_PORT,
  type TelephonyProviderPort,
} from '../../providers/telephony-provider.port';
import { TelephonyMappingsService } from './telephony-mappings.service';

export type TelephonyProviderStatusView = {
  provider: string;
  configured: boolean;
  credentialsValid: boolean;
  credentialsMessage: string | null;
  webhookSignatureValidation: boolean;
  webhookUrls: {
    incomingCall: string;
    statusCallback: string;
  } | null;
  activePhoneNumbers: number;
};

@Injectable()
export class TelephonyStatusService {
  constructor(
    @Inject(TELEPHONY_PROVIDER_PORT)
    private readonly telephony: TelephonyProviderPort,
    private readonly mappings: TelephonyMappingsService,
    private readonly config: ConfigService,
  ) {}

  async getProviderStatus(): Promise<TelephonyProviderStatusView> {
    const provider = this.telephony.providerName;
    const configured = this.telephony.isConfigured();
    let credentialsValid = false;
    let credentialsMessage: string | null = null;

    if (configured) {
      const validation = await this.telephony.validateCredentials();
      credentialsValid = validation.ok;
      credentialsMessage = validation.ok ? null : validation.reason;
    } else {
      credentialsMessage = 'Twilio credentials are not configured on the server.';
    }

    const webhookUrls = configured ? this.buildWebhookUrls() : null;

    const activePhoneNumbers = configured
      ? await this.mappings.countActive(provider)
      : 0;

    return {
      provider,
      configured,
      credentialsValid,
      credentialsMessage,
      webhookSignatureValidation:
        this.config.get<boolean>('twilio.validateSignatures') ?? true,
      webhookUrls,
      activePhoneNumbers,
    };
  }

  async healthCheck(): Promise<'up' | 'down' | 'disabled'> {
    if (!this.telephony.isConfigured()) {
      return 'disabled';
    }
    const validation = await this.telephony.validateCredentials();
    return validation.ok ? 'up' : 'down';
  }

  private buildWebhookUrls(): {
    incomingCall: string;
    statusCallback: string;
  } {
    const baseUrl = this.config
      .getOrThrow<string>('app.publicBaseUrl')
      .replace(/\/$/, '');
    return {
      incomingCall: `${baseUrl}/api/v1/webhooks/twilio/incoming-call`,
      statusCallback: `${baseUrl}/api/v1/webhooks/twilio/status-callback`,
    };
  }
}
