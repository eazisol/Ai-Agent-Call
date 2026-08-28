import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../common/errors/application-error';
import type {
  KnowledgePublishInput,
  KnowledgePublishResult,
  KnowledgeProviderStatus,
  KnowledgeSyncPort,
} from '../knowledge-sync.port';

type ElevenLabsConfig = {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
};

/**
 * ElevenLabs ConvAI knowledge-base adapter.
 *
 * Update strategy: ElevenLabs has no dedicated document-update endpoint for
 * all source types. On update we best-effort DELETE the previous document
 * then CREATE a new one and return the new external id (caller replaces mapping).
 */
@Injectable()
export class ElevenLabsKnowledgeSyncAdapter implements KnowledgeSyncPort {
  readonly providerName = 'elevenlabs' as const;
  private readonly logger = new Logger(ElevenLabsKnowledgeSyncAdapter.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.readConfig().apiKey);
  }

  async publish(input: KnowledgePublishInput): Promise<KnowledgePublishResult> {
    this.requireConfigured();
    const response = await this.createDocument(input);
    return {
      externalSourceId: this.extractDocumentId(response),
      warnings: [],
    };
  }

  async update(
    externalId: string,
    input: KnowledgePublishInput,
  ): Promise<KnowledgePublishResult> {
    this.requireConfigured();
    // No dedicated update API — delete then recreate (or create if delete fails).
    try {
      await this.remove(externalId);
    } catch (error) {
      this.logger.warn(
        `ElevenLabs knowledge delete-before-update failed for ${externalId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
    return this.publish(input);
  }

  async remove(externalId: string): Promise<void> {
    if (!this.isConfigured() || !externalId) {
      return;
    }
    try {
      await this.request(
        'DELETE',
        `/v1/convai/knowledge-base/${encodeURIComponent(externalId)}`,
      );
    } catch (error) {
      if (error instanceof ApplicationError && error.statusCode === 404) {
        return;
      }
      // Best-effort: log and swallow so local delete is not blocked.
      this.logger.warn(
        `ElevenLabs knowledge remove best-effort failed for ${externalId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  async getStatus(externalId: string): Promise<KnowledgeProviderStatus> {
    this.requireConfigured();
    try {
      const response = await this.request(
        'GET',
        `/v1/convai/knowledge-base/${encodeURIComponent(externalId)}`,
      );
      const name =
        typeof response.name === 'string'
          ? response.name
          : typeof response.id === 'string'
            ? response.id
            : null;
      return {
        externalSourceId: externalId,
        exists: true,
        name,
        rawStatus: 'available',
      };
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        (error.statusCode === 404 || error.code === 'PROVIDER_SYNC_FAILED')
      ) {
        return {
          externalSourceId: externalId,
          exists: false,
          name: null,
          rawStatus: 'missing',
        };
      }
      throw error;
    }
  }

  private async createDocument(
    input: KnowledgePublishInput,
  ): Promise<Record<string, unknown>> {
    const name = input.name.slice(0, 200);

    if (input.type === 'url') {
      if (!input.url) {
        throw new ApplicationError(
          'KNOWLEDGE_URL_INVALID',
          'URL is required for URL knowledge sources.',
          400,
        );
      }
      return this.request('POST', '/v1/convai/knowledge-base/url', {
        url: input.url,
        name,
      });
    }

    if (
      input.type === 'file' &&
      input.fileBytes &&
      input.fileBytes.length > 0
    ) {
      return this.uploadFile(name, input);
    }

    const text = this.resolveTextBody(input);
    return this.request('POST', '/v1/convai/knowledge-base/text', {
      text,
      name,
    });
  }

  private resolveTextBody(input: KnowledgePublishInput): string {
    if (input.type === 'faq') {
      const items = input.faqItems ?? [];
      if (items.length === 0 && input.textBody) {
        return input.textBody.slice(0, 500_000);
      }
      const rendered = items
        .map(
          (item, index) =>
            `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`,
        )
        .join('\n\n');
      if (!rendered.trim()) {
        throw new ApplicationError(
          'KNOWLEDGE_TYPE_INVALID',
          'FAQ knowledge source has no items to sync.',
          400,
        );
      }
      return rendered.slice(0, 500_000);
    }

    const body = (input.textBody ?? '').trim();
    if (!body) {
      throw new ApplicationError(
        'KNOWLEDGE_TYPE_INVALID',
        'Knowledge source has no text content to sync.',
        400,
      );
    }
    return body.slice(0, 500_000);
  }

  private async uploadFile(
    name: string,
    input: KnowledgePublishInput,
  ): Promise<Record<string, unknown>> {
    const cfg = this.readConfig();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    try {
      const form = new FormData();
      form.append('name', name);
      const bytes = Uint8Array.from(input.fileBytes!);
      const blob = new Blob([bytes], {
        type: input.contentType || 'application/octet-stream',
      });
      form.append('file', blob, input.originalFilename || 'knowledge-file');

      const response = await fetch(
        `${cfg.baseUrl}/v1/convai/knowledge-base/file`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'xi-api-key': cfg.apiKey,
          },
          body: form,
          signal: controller.signal,
        },
      );

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
          'The knowledge provider did not respond in time. Please try again.',
          503,
        );
      }
      this.logger.warn(
        `ElevenLabs knowledge file upload failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The knowledge provider is temporarily unavailable. Please try again.',
        503,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private extractDocumentId(payload: Record<string, unknown>): string {
    const id =
      (typeof payload.id === 'string' && payload.id) ||
      (typeof payload.document_id === 'string' && payload.document_id) ||
      (typeof payload.documentId === 'string' && payload.documentId);
    if (!id) {
      throw new ApplicationError(
        'PROVIDER_SYNC_FAILED',
        'The knowledge provider returned an unexpected response.',
        502,
      );
    }
    return id;
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
    };
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
          ...(body ? { 'Content-Type': 'application/json' } : {}),
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
          'The knowledge provider did not respond in time. Please try again.',
          503,
        );
      }
      this.logger.warn(
        `ElevenLabs knowledge request failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The knowledge provider is temporarily unavailable. Please try again.',
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
        'Knowledge provider authentication failed. Contact support.',
        502,
      );
    }
    if (status === 404) {
      return new ApplicationError(
        'PROVIDER_SYNC_FAILED',
        'The provider knowledge document was not found.',
        404,
      );
    }
    if (status === 429) {
      return new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The knowledge provider is rate-limiting requests. Please retry shortly.',
        503,
      );
    }
    if (status >= 500) {
      return new ApplicationError(
        'PROVIDER_UNAVAILABLE',
        'The knowledge provider is temporarily unavailable. Please try again.',
        503,
      );
    }
    return new ApplicationError(
      'PROVIDER_SYNC_FAILED',
      'Knowledge provider sync failed. Please retry or contact support.',
      502,
    );
  }
}
