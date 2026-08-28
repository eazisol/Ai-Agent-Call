/**
 * Provider-neutral voice catalogue port (M08).
 * Registry name: VoiceCatalogProvider.
 */

export type VoiceCatalogProviderName = string;

export type CatalogVoiceGenderPresentation =
  | 'female'
  | 'male'
  | 'neutral'
  | 'unknown';

export type CatalogVoiceEntry = {
  externalVoiceId: string;
  displayName: string;
  description: string | null;
  languageCodes: string[];
  genderPresentation: CatalogVoiceGenderPresentation;
  accent: string | null;
  styleLabels: string[];
  previewSampleText: string | null;
  metadata: Record<string, unknown>;
};

export type VoicePreviewInput = {
  externalVoiceId: string;
  sampleText?: string | null;
  catalogPreviewUrl?: string | null;
};

export type VoicePreviewResult = {
  audioBytes: Buffer;
  contentType: string;
};

export interface VoiceCatalogPort {
  readonly providerName: VoiceCatalogProviderName;
  isConfigured(): boolean;
  listVoices(): Promise<CatalogVoiceEntry[]>;
  getVoice(externalVoiceId: string): Promise<CatalogVoiceEntry | null>;
  previewVoice(input: VoicePreviewInput): Promise<VoicePreviewResult>;
}

export const VOICE_CATALOG_PORT = Symbol('VOICE_CATALOG_PORT');
