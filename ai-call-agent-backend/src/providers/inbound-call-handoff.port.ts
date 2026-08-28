export type ResolvedInboundCall = {
  callId: string;
  externalCallId: string;
  callerNumber?: string;
  receiverNumber?: string;
  businessId: string;
  agentId: string;
  externalAgentId: string;
  greeting: string;
};

export type InboundFailureResponseInput = {
  externalCallId: string;
  failureCode: string;
  safeMessage: string;
};

export interface InboundCallHandoffPort {
  readonly providerName: string;
  isConfigured(): boolean;
  buildConnectResponse(input: ResolvedInboundCall): Promise<string>;
  buildFailureResponse(input: InboundFailureResponseInput): string;
}

export const INBOUND_CALL_HANDOFF_PORT = Symbol('INBOUND_CALL_HANDOFF_PORT');
