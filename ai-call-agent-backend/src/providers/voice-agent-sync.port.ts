/**
 * Provider-neutral voice-agent provisioning / sync port (M06).
 * Distinct from VoiceAgentProviderPort (realtime WebSocket / OpenAI prototype).
 */

export type VoiceAgentSyncProviderName = string;

export type ProviderAgentCreateInput = {
  name: string;
  roleLabel: string;
  personality: string | null;
  greeting: string;
  instructions: string;
  /** Default / fallback language code */
  language: string;
  languages: string[];
  languageDetectionEnabled: boolean;
  languageSwitchingEnabled: boolean;
  voicePreference: 'female' | 'male' | 'neutral';
};

export type ProviderAgentUpdateInput = ProviderAgentCreateInput;

export type ProviderAgentResult = {
  externalAgentId: string;
  /** Non-blocking customer-safe warnings (e.g. unsupported language). */
  warnings: string[];
};

export type ProviderAgentStatus = {
  externalAgentId: string;
  exists: boolean;
  name?: string | null;
  rawStatus?: string | null;
};

export interface VoiceAgentSyncPort {
  readonly providerName: VoiceAgentSyncProviderName;
  isConfigured(): boolean;
  create(input: ProviderAgentCreateInput): Promise<ProviderAgentResult>;
  update(
    externalId: string,
    input: ProviderAgentUpdateInput,
  ): Promise<ProviderAgentResult>;
  /** Best-effort soft disable when the provider supports it; may no-op. */
  deactivate(externalId: string): Promise<void>;
  delete(externalId: string): Promise<void>;
  getStatus(externalId: string): Promise<ProviderAgentStatus>;
}

export const VOICE_AGENT_SYNC_PORT = Symbol('VOICE_AGENT_SYNC_PORT');
