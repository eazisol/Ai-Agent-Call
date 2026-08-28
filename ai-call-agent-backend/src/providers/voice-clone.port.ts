/**
 * Provider-neutral voice cloning port (M09).
 */

export type VoiceCloneSampleInput = {
  buffer: Buffer;
  filename: string;
  contentType: string;
};

export type VoiceCloneCreateInput = {
  displayName: string;
  description?: string | null;
  samples: VoiceCloneSampleInput[];
  labels?: Record<string, string>;
};

export type VoiceCloneCreateResult = {
  externalVoiceId: string;
  previewUrl?: string;
  metadata?: Record<string, unknown>;
};

export interface VoiceClonePort {
  readonly providerName: string;
  isConfigured(): boolean;
  createClone(input: VoiceCloneCreateInput): Promise<VoiceCloneCreateResult>;
  deleteClone?(externalVoiceId: string): Promise<void>;
}

export const VOICE_CLONE_PORT = Symbol('VOICE_CLONE_PORT');

export const VOICE_CLONE_CONSENT_VERSION = 'm09-v1';
