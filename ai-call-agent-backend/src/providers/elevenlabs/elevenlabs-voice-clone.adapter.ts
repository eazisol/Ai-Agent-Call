import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  VoiceCloneCreateInput,
  VoiceCloneCreateResult,
  VoiceClonePort,
} from '../voice-clone.port';

type ElevenLabsConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
};

@Injectable()
export class ElevenLabsVoiceCloneAdapter implements VoiceClonePort {
  readonly providerName = 'elevenlabs' as const;
  private readonly logger = new Logger(ElevenLabsVoiceCloneAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.readConfig().apiKey);
  }

  async createClone(
    input: VoiceCloneCreateInput,
  ): Promise<VoiceCloneCreateResult> {
    this.requireConfigured();
    if (input.samples.length === 0) {
      throw new ApplicationError(
        'VOICE_CLONE_SAMPLES_REQUIRED',
        'At least one voice sample is required.',
        400,
      );
    }

    const cfg = this.readConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const form = new FormData();
      form.append('name', input.displayName.slice(0, 200));
      if (input.description?.trim()) {
        form.append('description', input.description.trim().slice(0, 500));
      }
      if (input.labels && Object.keys(input.labels).length > 0) {
        form.append('labels', JSON.stringify(input.labels));
      }
      for (const sample of input.samples) {
        form.append(
          'files',
          new Blob([Uint8Array.from(sample.buffer)], {
            type: sample.contentType,
          }),
          sample.filename,
        );
      }

      const response = await fetch(`${cfg.baseUrl}/v1/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': cfg.apiKey,
        },
        body: form,
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
        this.logger.warn(
          `ElevenLabs clone HTTP ${response.status}: ${text.slice(0, 500)}`,
        );
        throw this.mapHttpError(response.status, json);
      }

      const externalVoiceId =
        (typeof json.voice_id === 'string' && json.voice_id) ||
        (typeof json.voiceId === 'string' && json.voiceId) ||
        null;
      if (!externalVoiceId) {
        throw new ApplicationError(
          'VOICE_CLONE_PROVIDER_FAILED',
          'The voice provider returned an invalid clone response.',
          502,
        );
      }

      return {
        externalVoiceId,
        metadata: {
          requiresVerification:
            typeof json.requires_verification === 'boolean'
              ? json.requires_verification
              : undefined,
        },
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
      this.logger.warn(
        `ElevenLabs clone request failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new ApplicationError(
        'VOICE_CLONE_PROVIDER_FAILED',
        error instanceof Error &&
          (error.message.includes('fetch failed') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('ETIMEDOUT'))
          ? 'Unable to reach the ElevenLabs API. Check your internet connection and try again.'
          : 'Voice cloning is temporarily unavailable. Please try again.',
        503,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async deleteClone(externalVoiceId: string): Promise<void> {
    this.requireConfigured();
    const cfg = this.readConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const response = await fetch(
        `${cfg.baseUrl}/v1/voices/${encodeURIComponent(externalVoiceId)}`,
        {
          method: 'DELETE',
          headers: {
            'xi-api-key': cfg.apiKey,
          },
          signal: controller.signal,
        },
      );
      if (!response.ok && response.status !== 404) {
        this.logger.warn(
          `ElevenLabs delete clone failed for ${externalVoiceId}: HTTP ${response.status}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `ElevenLabs delete clone failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    } finally {
      clearTimeout(timer);
    }
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

  private mapHttpError(
    status: number,
    json: Record<string, unknown>,
  ): ApplicationError {
    const detail = this.extractProviderMessage(json);
    const detailObject = this.extractProviderDetailObject(json);

    if (status === 401 || status === 403) {
      return new ApplicationError(
        'PROVIDER_AUTH_FAILED',
        'The voice provider rejected the server credentials.',
        502,
      );
    }
    if (
      detailObject?.code === 'paid_plan_required' ||
      detailObject?.status === 'can_not_use_instant_voice_cloning'
    ) {
      return new ApplicationError(
        'VOICE_CLONE_PLAN_REQUIRED',
        detail ??
          'Instant voice cloning requires an ElevenLabs paid plan. Upgrade the account tied to your server API key, or use catalogue voices from the Voice Library instead.',
        402,
      );
    }
    if (status === 422 || status === 400) {
      const message =
        detail ??
        'The voice provider rejected the submitted samples. Upload about 1–2 minutes of clear speech (MP3 recommended).';
      return new ApplicationError('VOICE_CLONE_PROVIDER_FAILED', message, 400);
    }
    if (status === 429) {
      return new ApplicationError(
        'PROVIDER_RATE_LIMITED',
        'The voice provider is busy. Please try again shortly.',
        503,
      );
    }
    return new ApplicationError(
      'VOICE_CLONE_PROVIDER_FAILED',
      detail ?? 'The voice provider returned an unexpected error.',
      502,
    );
  }

  private extractProviderMessage(json: Record<string, unknown>): string | null {
    if (typeof json.detail === 'string' && json.detail.trim()) {
      return json.detail.trim();
    }
    if (typeof json.message === 'string' && json.message.trim()) {
      return json.message.trim();
    }
    const nested = this.extractProviderDetailObject(json);
    if (nested?.message?.trim()) {
      return nested.message.trim();
    }
    if (Array.isArray(json.detail)) {
      const parts = json.detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const row = item as { msg?: string; message?: string };
            return row.msg ?? row.message ?? null;
          }
          return null;
        })
        .filter((value): value is string => Boolean(value?.trim()));
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    return null;
  }

  private extractProviderDetailObject(
    json: Record<string, unknown>,
  ): { message?: string; code?: string; status?: string } | null {
    if (
      !json.detail ||
      typeof json.detail !== 'object' ||
      Array.isArray(json.detail)
    ) {
      return null;
    }
    const row = json.detail as {
      message?: string;
      code?: string;
      status?: string;
      msg?: string;
    };
    return {
      message: row.message ?? row.msg,
      code: row.code,
      status: row.status,
    };
  }
}
