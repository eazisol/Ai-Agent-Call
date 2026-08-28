import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  CatalogVoiceEntry,
  CatalogVoiceGenderPresentation,
  VoiceCatalogPort,
  VoicePreviewInput,
  VoicePreviewResult,
} from '../voice-catalog.port';

type ElevenLabsConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
};

const DEFAULT_PREVIEW_TEXT =
  'Hello, thank you for calling. How may I help you today?';

@Injectable()
export class ElevenLabsVoiceCatalogAdapter implements VoiceCatalogPort {
  readonly providerName = 'elevenlabs' as const;
  private readonly logger = new Logger(ElevenLabsVoiceCatalogAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.readConfig().apiKey);
  }

  async listVoices(): Promise<CatalogVoiceEntry[]> {
    this.requireConfigured();
    const response = await this.requestJson('GET', '/v1/voices');
    const voices = Array.isArray(response.voices) ? response.voices : [];
    return voices
      .map((row) => this.normalizeVoice(row))
      .filter((row): row is CatalogVoiceEntry => row != null);
  }

  async getVoice(externalVoiceId: string): Promise<CatalogVoiceEntry | null> {
    this.requireConfigured();
    try {
      const response = await this.requestJson(
        'GET',
        `/v1/voices/${encodeURIComponent(externalVoiceId)}`,
      );
      return this.normalizeVoice(response);
    } catch (error) {
      if (error instanceof ApplicationError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async previewVoice(input: VoicePreviewInput): Promise<VoicePreviewResult> {
    this.requireConfigured();
    const sampleText = (input.sampleText?.trim() || DEFAULT_PREVIEW_TEXT).slice(
      0,
      1000,
    );
    const catalogPreviewUrl =
      typeof input.catalogPreviewUrl === 'string' &&
      input.catalogPreviewUrl.trim()
        ? input.catalogPreviewUrl.trim()
        : null;
    const useCatalogSample =
      !input.sampleText?.trim() ||
      input.sampleText.trim() === DEFAULT_PREVIEW_TEXT;

    if (catalogPreviewUrl && useCatalogSample) {
      try {
        return await this.fetchPreviewFromUrl(catalogPreviewUrl);
      } catch (error) {
        this.logger.warn(
          `ElevenLabs catalog preview URL failed: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    try {
      const audioBytes = await this.requestBinary(
        'POST',
        `/v1/text-to-speech/${encodeURIComponent(input.externalVoiceId)}`,
        {
          text: sampleText,
          model_id: 'eleven_multilingual_v2',
        },
      );
      return {
        audioBytes,
        contentType: 'audio/mpeg',
      };
    } catch (error) {
      if (catalogPreviewUrl) {
        return this.fetchPreviewFromUrl(catalogPreviewUrl);
      }
      throw error;
    }
  }

  private normalizeVoice(raw: unknown): CatalogVoiceEntry | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const row = raw as Record<string, unknown>;
    const externalVoiceId =
      (typeof row.voice_id === 'string' && row.voice_id) ||
      (typeof row.voiceId === 'string' && row.voiceId) ||
      null;
    const displayName =
      (typeof row.name === 'string' && row.name.trim()) || externalVoiceId;
    if (!externalVoiceId || !displayName) {
      return null;
    }

    const labels =
      row.labels && typeof row.labels === 'object'
        ? (row.labels as Record<string, unknown>)
        : {};
    const styleLabels = this.collectStyleLabels(labels);
    const description =
      typeof labels.description === 'string'
        ? labels.description
        : typeof row.description === 'string'
          ? row.description
          : null;

    return {
      externalVoiceId,
      displayName: displayName.slice(0, 200),
      description,
      languageCodes: this.extractLanguageCodes(row, labels),
      genderPresentation: this.normalizeGender(labels.gender),
      accent:
        typeof labels.accent === 'string'
          ? labels.accent.slice(0, 100)
          : null,
      styleLabels,
      previewSampleText: DEFAULT_PREVIEW_TEXT,
      metadata: {
        category:
          typeof row.category === 'string' ? row.category : labels.use_case,
        previewUrl:
          typeof row.preview_url === 'string' ? row.preview_url : undefined,
      },
    };
  }

  private extractLanguageCodes(
    row: Record<string, unknown>,
    labels: Record<string, unknown>,
  ): string[] {
    const codes = new Set<string>();
    const verified = row.verified_languages;
    if (Array.isArray(verified)) {
      for (const item of verified) {
        if (typeof item === 'string') {
          codes.add(item);
        } else if (item && typeof item === 'object') {
          const lang = (item as Record<string, unknown>).language;
          if (typeof lang === 'string') {
            codes.add(lang);
          }
        }
      }
    }
    if (typeof labels.language === 'string') {
      codes.add(labels.language);
    }
    if (codes.size === 0) {
      codes.add('en');
    }
    return [...codes];
  }

  private collectStyleLabels(labels: Record<string, unknown>): string[] {
    const tags = new Set<string>();
    for (const key of ['use_case', 'age', 'descriptive']) {
      const value = labels[key];
      if (typeof value === 'string' && value.trim()) {
        tags.add(value.trim());
      }
    }
    return [...tags].slice(0, 10);
  }

  private normalizeGender(value: unknown): CatalogVoiceGenderPresentation {
    if (typeof value !== 'string') {
      return 'unknown';
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'female') return 'female';
    if (normalized === 'male') return 'male';
    if (normalized === 'neutral') return 'neutral';
    return 'unknown';
  }

  private readConfig(): ElevenLabsConfig {
    return {
      apiKey: this.config.get<string>('elevenlabs.apiKey') ?? '',
      baseUrl:
        this.config.get<string>('elevenlabs.baseUrl') ??
        'https://api.elevenlabs.io',
      timeoutMs: this.config.get<number>('elevenlabs.timeoutMs') ?? 20_000,
    };
  }

  private requireConfigured(): void {
    if (!this.isConfigured()) {
      throw new ApplicationError(
        'PROVIDER_NOT_CONFIGURED',
        'ElevenLabs is not configured on the server.',
        503,
      );
    }
  }

  private async requestJson(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const cfg = this.readConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const response = await fetch(`${cfg.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'xi-api-key': cfg.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      let json: Record<string, unknown> = {};
      if (text) {
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {
          json = {};
        }
      }

      if (!response.ok) {
        throw this.mapHttpError(response.status);
      }
      return json;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('abort'))
      ) {
        throw new ApplicationError(
          'PROVIDER_UNAVAILABLE',
          'The voice provider did not respond in time. Please try again.',
          503,
        );
      }
      this.logger.warn(
        `ElevenLabs catalogue request failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new ApplicationError(
        'VOICE_CATALOG_UNAVAILABLE',
        error instanceof Error &&
          (error.message.includes('fetch failed') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ETIMEDOUT'))
          ? 'Unable to reach the ElevenLabs API. Check your internet connection, VPN, or firewall and try again.'
          : 'The voice catalogue is temporarily unavailable. Please try again.',
        503,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchPreviewFromUrl(url: string): Promise<VoicePreviewResult> {
    const cfg = this.readConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw this.mapHttpError(response.status);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBytes = Buffer.from(arrayBuffer);
      if (audioBytes.length < 256) {
        throw new ApplicationError(
          'VOICE_PREVIEW_FAILED',
          'Preview audio was empty.',
          502,
        );
      }
      if (audioBytes[0] === 0x3c) {
        throw new ApplicationError(
          'VOICE_PREVIEW_FAILED',
          'Preview audio was unavailable.',
          502,
        );
      }

      return {
        audioBytes,
        contentType: this.resolveAudioContentType(
          audioBytes,
          response.headers.get('content-type'),
          url,
        ),
      };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('abort'))
      ) {
        throw new ApplicationError(
          'PROVIDER_UNAVAILABLE',
          'The voice provider did not respond in time. Please try again.',
          503,
        );
      }
      throw new ApplicationError(
        'VOICE_PREVIEW_FAILED',
        error instanceof Error &&
          (error.message.includes('fetch failed') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ETIMEDOUT'))
          ? 'Unable to reach the ElevenLabs preview audio. Check your internet connection and try again.'
          : 'Voice preview is temporarily unavailable. Please try again.',
        503,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private resolveAudioContentType(
    audioBytes: Buffer,
    headerValue: string | null,
    sourceUrl: string,
  ): string {
    const sniffed = this.sniffAudioContentType(audioBytes);
    if (sniffed) {
      return sniffed;
    }

    const normalizedHeader = headerValue?.split(';')[0]?.trim().toLowerCase();
    if (
      normalizedHeader &&
      normalizedHeader !== 'application/octet-stream' &&
      normalizedHeader.startsWith('audio/')
    ) {
      return normalizedHeader;
    }

    const loweredUrl = sourceUrl.toLowerCase();
    if (loweredUrl.includes('.mp4') || loweredUrl.includes('.m4a')) {
      return 'audio/mp4';
    }
    if (loweredUrl.includes('.wav')) {
      return 'audio/wav';
    }
    if (loweredUrl.includes('.ogg')) {
      return 'audio/ogg';
    }

    return 'audio/mpeg';
  }

  private sniffAudioContentType(audioBytes: Buffer): string | null {
    if (
      audioBytes.length >= 3 &&
      audioBytes[0] === 0x49 &&
      audioBytes[1] === 0x44 &&
      audioBytes[2] === 0x33
    ) {
      return 'audio/mpeg';
    }
    if (
      audioBytes.length >= 2 &&
      audioBytes[0] === 0xff &&
      (audioBytes[1] & 0xe0) === 0xe0
    ) {
      return 'audio/mpeg';
    }
    if (
      audioBytes.length >= 12 &&
      audioBytes[4] === 0x66 &&
      audioBytes[5] === 0x74 &&
      audioBytes[6] === 0x79 &&
      audioBytes[7] === 0x70
    ) {
      return 'audio/mp4';
    }
    if (
      audioBytes.length >= 4 &&
      audioBytes[0] === 0x4f &&
      audioBytes[1] === 0x67 &&
      audioBytes[2] === 0x67 &&
      audioBytes[3] === 0x53
    ) {
      return 'audio/ogg';
    }
    if (
      audioBytes.length >= 4 &&
      audioBytes[0] === 0x52 &&
      audioBytes[1] === 0x49 &&
      audioBytes[2] === 0x46 &&
      audioBytes[3] === 0x46
    ) {
      return 'audio/wav';
    }
    return null;
  }

  private async requestBinary(
    method: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<Buffer> {
    const cfg = this.readConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const response = await fetch(`${cfg.baseUrl}${path}`, {
        method,
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': cfg.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw this.mapHttpError(response.status);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message.includes('abort'))
      ) {
        throw new ApplicationError(
          'PROVIDER_UNAVAILABLE',
          'The voice provider did not respond in time. Please try again.',
          503,
        );
      }
      this.logger.warn(
        `ElevenLabs preview request failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new ApplicationError(
        'VOICE_PREVIEW_FAILED',
        'Voice preview is temporarily unavailable. Please try again.',
        503,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private mapHttpError(status: number): ApplicationError {
    if (status === 401 || status === 403) {
      return new ApplicationError(
        'PROVIDER_AUTH_FAILED',
        'The voice provider rejected the server credentials.',
        502,
      );
    }
    if (status === 404) {
      return new ApplicationError(
        'VOICE_NOT_FOUND',
        'The selected voice is no longer available.',
        404,
      );
    }
    if (status === 429) {
      return new ApplicationError(
        'PROVIDER_RATE_LIMITED',
        'The voice provider is busy. Please try again shortly.',
        503,
      );
    }
    return new ApplicationError(
      'VOICE_PREVIEW_FAILED',
      'The voice provider returned an unexpected error.',
      502,
    );
  }
}
