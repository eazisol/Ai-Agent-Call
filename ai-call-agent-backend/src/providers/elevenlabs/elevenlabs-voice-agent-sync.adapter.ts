import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  ProviderAgentCreateInput,
  ProviderAgentResult,
  ProviderAgentStatus,
  ProviderAgentUpdateInput,
  VoiceAgentSyncPort,
} from '../voice-agent-sync.port';

/** Languages commonly accepted by ElevenLabs conversational agents (expand over time). */
const ELEVENLABS_AGENT_LANGUAGE_CODES = new Set([
  'en',
  'es',
  'fr',
  'de',
  'pt',
  'ar',
  'hi',
  'zh',
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'it',
  'nl',
  'pl',
  'ru',
  'tr',
  'sv',
  'no',
  'da',
  'fi',
  'cs',
  'ro',
  'hu',
  'uk',
  'el',
  'id',
  'ms',
  'vi',
  'th',
  'tl',
  'he',
  'bn',
]);

type ElevenLabsConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  voiceFemale: string;
  voiceMale: string;
  voiceNeutral: string;
};

@Injectable()
export class ElevenLabsVoiceAgentSyncAdapter implements VoiceAgentSyncPort {
  readonly providerName = 'elevenlabs' as const;
  private readonly logger = new Logger(ElevenLabsVoiceAgentSyncAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.readConfig().apiKey);
  }

  async create(input: ProviderAgentCreateInput): Promise<ProviderAgentResult> {
    this.requireConfigured();
    const body = this.buildPayload(input);
    const warnings = this.collectWarnings(input);
    const response = await this.request(
      'POST',
      '/v1/convai/agents/create',
      body,
    );
    const externalAgentId = this.extractAgentId(response);
    return { externalAgentId, warnings };
  }

  async update(
    externalId: string,
    input: ProviderAgentUpdateInput,
  ): Promise<ProviderAgentResult> {
    this.requireConfigured();
    const body = this.buildPayload(input);
    const warnings = this.collectWarnings(input);
    await this.request(
      'PATCH',
      `/v1/convai/agents/${encodeURIComponent(externalId)}`,
      body,
    );
    return { externalAgentId: externalId, warnings };
  }

  async deactivate(externalId: string): Promise<void> {
    // ConvAI has no dedicated deactivate; leave remote agent intact on local archive.
    this.logger.log(
      `ElevenLabs deactivate skipped for ${externalId} (no soft-disable API; remote retained)`,
    );
  }

  async delete(externalId: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }
    await this.request(
      'DELETE',
      `/v1/convai/agents/${encodeURIComponent(externalId)}`,
    );
  }

  async getStatus(externalId: string): Promise<ProviderAgentStatus> {
    this.requireConfigured();
    try {
      const response = await this.request(
        'GET',
        `/v1/convai/agents/${encodeURIComponent(externalId)}`,
      );
      const name =
        typeof response.name === 'string'
          ? response.name
          : typeof response.agent_id === 'string'
            ? response.agent_id
            : null;
      return {
        externalAgentId: externalId,
        exists: true,
        name,
        rawStatus: 'available',
      };
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.code === 'PROVIDER_SYNC_FAILED' &&
        error.statusCode === 404
      ) {
        return {
          externalAgentId: externalId,
          exists: false,
          name: null,
          rawStatus: 'missing',
        };
      }
      throw error;
    }
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

  private readConfig(): ElevenLabsConfig {
    return {
      apiKey: (this.config.get<string>('elevenlabs.apiKey') ?? '').trim(),
      baseUrl: (
        this.config.get<string>('elevenlabs.baseUrl') ??
        'https://api.elevenlabs.io'
      ).replace(/\/$/, ''),
      timeoutMs: this.config.get<number>('elevenlabs.timeoutMs') ?? 20_000,
      voiceFemale:
        this.config.get<string>('elevenlabs.voiceFemale') ??
        'EXAVITQu4vr4xnSDxMaL',
      voiceMale:
        this.config.get<string>('elevenlabs.voiceMale') ??
        'pNInz6obpgDQGcFmaJgB',
      voiceNeutral:
        this.config.get<string>('elevenlabs.voiceNeutral') ??
        'JBFqnCBsd6RMkjVDRZzb',
    };
  }

  private resolveVoiceId(
    preference: ProviderAgentCreateInput['voicePreference'],
  ): string {
    const cfg = this.readConfig();
    if (preference === 'female') return cfg.voiceFemale;
    if (preference === 'male') return cfg.voiceMale;
    return cfg.voiceNeutral;
  }

  private buildPrompt(input: ProviderAgentCreateInput): string {
    const parts = [
      `Role: ${input.roleLabel}`,
      input.personality ? `Personality: ${input.personality}` : null,
      `Instructions:\n${input.instructions}`,
    ].filter(Boolean);
    return parts.join('\n\n');
  }

  private primaryLanguage(input: ProviderAgentCreateInput): string {
    const code = (input.language || input.languages[0] || 'en').trim();
    const primary = code.split('-')[0]?.toLowerCase() || 'en';
    if (ELEVENLABS_AGENT_LANGUAGE_CODES.has(code)) {
      return code.length <= 5 ? code : primary;
    }
    if (ELEVENLABS_AGENT_LANGUAGE_CODES.has(primary)) {
      return primary;
    }
    return 'en';
  }

  private collectWarnings(input: ProviderAgentCreateInput): string[] {
    const warnings: string[] = [];
    for (const code of input.languages) {
      const primary = code.split('-')[0]?.toLowerCase() || code;
      if (
        !ELEVENLABS_AGENT_LANGUAGE_CODES.has(code) &&
        !ELEVENLABS_AGENT_LANGUAGE_CODES.has(primary)
      ) {
        warnings.push(
          `${this.labelFor(code)} is configured for this agent but may not be supported by the currently selected voice/model.`,
        );
      }
    }
    if (input.languageSwitchingEnabled && input.languages.length > 1) {
      warnings.push(
        'Mid-call language switching is enabled locally; provider support depends on the selected ElevenLabs model and configuration.',
      );
    }
    return warnings;
  }

  private labelFor(code: string): string {
    return code;
  }

  private buildPayload(
    input: ProviderAgentCreateInput,
  ): Record<string, unknown> {
    const language = this.primaryLanguage(input);
    return {
      name: input.name.slice(0, 100),
      conversation_config: {
        agent: {
          first_message: input.greeting.slice(0, 2000),
          language,
          prompt: {
            prompt: this.buildPrompt(input).slice(0, 20_000),
          },
        },
        tts: {
          voice_id: this.resolveVoiceId(input.voicePreference),
        },
      },
    };
  }

  private extractAgentId(payload: Record<string, unknown>): string {
    const id =
      (typeof payload.agent_id === 'string' && payload.agent_id) ||
      (typeof payload.agentId === 'string' && payload.agentId) ||
      (typeof payload.id === 'string' && payload.id);
    if (!id) {
      throw new ApplicationError(
        'PROVIDER_SYNC_FAILED',
        'The voice provider returned an unexpected response.',
        502,
      );
    }
    return id;
  }

  private async request(
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
        `ElevenLabs request failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      throw new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The voice provider is temporarily unavailable. Please try again.',
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
        'Voice provider authentication failed. Contact support.',
        502,
      );
    }
    if (status === 404) {
      return new ApplicationError(
        'PROVIDER_SYNC_FAILED',
        'The provider agent was not found.',
        404,
      );
    }
    if (status === 429) {
      return new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The voice provider is rate-limiting requests. Please retry shortly.',
        503,
      );
    }
    if (status >= 500) {
      return new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The voice provider is temporarily unavailable. Please try again.',
        503,
      );
    }
    return new ApplicationError(
      'PROVIDER_SYNC_FAILED',
      'Voice provider sync failed. Please retry or contact support.',
      502,
    );
  }
}
