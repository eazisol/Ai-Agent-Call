import type WebSocket from 'ws';

export interface VoiceAgentProviderPort {
  readonly providerName: string;
  createRealtimeConnection(): WebSocket;
}

export const VOICE_AGENT_PROVIDER_PORT = Symbol('VOICE_AGENT_PROVIDER_PORT');
