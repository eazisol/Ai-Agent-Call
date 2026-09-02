export const ROUTING_FAILURE_CODES = [
  'UNKNOWN_NUMBER',
  'UNASSIGNED_NUMBER',
  'INACTIVE_AGENT',
  'CROSS_BUSINESS_MAPPING',
  'UNSYNCED_AGENT',
  'PROVIDER_UNAVAILABLE',
  'HANDOFF_FAILED',
  'KNOWLEDGE_NOT_READY',
  'VOICE_NOT_READY',
] as const;

export type RoutingFailureCode = (typeof ROUTING_FAILURE_CODES)[number];

export type ResolvedRoutingContext = {
  phoneNumberId: string;
  phoneNumberE164: string;
  businessId: string;
  agentId: string;
  agentName: string;
  externalAgentId: string;
  greeting: string;
};

export type RoutingFailure = {
  code: RoutingFailureCode;
  stage: string;
  businessId?: string;
  phoneNumberId?: string;
  agentId?: string;
  safeMessage: string;
};

export type RoutingResult =
  | { ok: true; context: ResolvedRoutingContext }
  | { ok: false; failure: RoutingFailure };

export const FAILURE_MESSAGES: Record<RoutingFailureCode, string> = {
  UNKNOWN_NUMBER: 'This number is not configured in EaziAiCall. Goodbye.',
  UNASSIGNED_NUMBER:
    'This line is not assigned to an agent yet. Please try again later.',
  INACTIVE_AGENT:
    'The assigned agent is not available. Please try again later.',
  CROSS_BUSINESS_MAPPING:
    'This call cannot be connected due to a configuration error.',
  UNSYNCED_AGENT: 'The assigned agent is not ready to receive calls yet.',
  PROVIDER_UNAVAILABLE:
    'The voice service is temporarily unavailable. Please try again later.',
  HANDOFF_FAILED: 'We could not connect your call. Please try again later.',
  KNOWLEDGE_NOT_READY: 'The assigned agent knowledge is not ready yet.',
  VOICE_NOT_READY: 'The assigned agent voice is not ready yet.',
};

export function normalizePhoneE164(value: string | undefined): string {
  return (value ?? '').trim();
}
