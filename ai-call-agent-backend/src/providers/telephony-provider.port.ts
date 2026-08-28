export interface TelephonyNumberCandidate {
  externalNumberId: string;
  phoneNumber: string;
  friendlyName?: string;
  locality?: string;
  region?: string;
  isoCountry: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
  monthlyPrice?: { amount: number; currency: string };
}

export interface TelephonyNumberPurchaseInput {
  phoneNumber: string;
  friendlyName?: string;
}

export interface TelephonyNumberPurchaseResult {
  externalNumberId: string;
  phoneNumber: string;
  configured: boolean;
}

export interface TelephonyNumberConfigureInput {
  externalNumberId: string;
  voiceWebhookUrl: string;
  statusCallbackUrl: string;
  smsWebhookUrl?: string;
}

export interface IncomingCallContext {
  externalCallId: string;
  callerNumber?: string;
  receiverNumber?: string;
}

export interface TelephonyProviderPort {
  readonly providerName: string;

  isConfigured(): boolean;
  validateCredentials(): Promise<{ ok: true } | { ok: false; reason: string }>;

  searchAvailableNumbers(input: {
    isoCountry: string;
    areaCode?: string;
    contains?: string;
    limit?: number;
  }): Promise<TelephonyNumberCandidate[]>;

  purchaseNumber(
    input: TelephonyNumberPurchaseInput,
  ): Promise<TelephonyNumberPurchaseResult>;

  lookupProvisionedNumber(
    phoneNumber: string,
  ): Promise<TelephonyNumberPurchaseResult>;

  configureNumber(input: TelephonyNumberConfigureInput): Promise<void>;

  releaseNumber(externalNumberId: string): Promise<void>;

  defaultWebhookUrls(): {
    voiceWebhookUrl: string;
    statusCallbackUrl: string;
  };

  validateWebhook(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean;

  buildIncomingCallResponse(context: IncomingCallContext): string;
}

export const TELEPHONY_PROVIDER_PORT = Symbol('TELEPHONY_PROVIDER_PORT');
