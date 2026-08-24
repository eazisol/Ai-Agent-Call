export interface IncomingCallContext {
  externalCallId: string;
  callerNumber?: string;
  receiverNumber?: string;
}

export interface TelephonyProviderPort {
  readonly providerName: string;
  validateWebhook(
    url: string,
    params: Record<string, string>,
    signature: string,
  ): boolean;
  buildIncomingCallResponse(context: IncomingCallContext): string;
}

export const TELEPHONY_PROVIDER_PORT = Symbol('TELEPHONY_PROVIDER_PORT');
